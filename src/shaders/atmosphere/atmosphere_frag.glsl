#version 300 es
precision highp float;

in vec2 v_position;

uniform vec3 u_lookVector;
uniform vec3 u_sunPosition;
uniform vec3 u_cameraSettings;
uniform vec3 u_eyePoint;

const float SUN_RADIUS = 10000.0;
const int N_OPTICAL_DEPTH_POINTS = 10;
const int N_IN_SCATTER_POINTS = 10;

const float PLANET_RAD = 8136e6;
const vec3 PLANET_CENTER = vec3(0, -PLANET_RAD - 10.0, 0); 

const float ATMOSPHERE_RAD = 8136e6;

const float DENSITY_FALLOFF = 2.64;

out vec4 outColor;

vec2 GetFilmCoord() {
    float nearPlane = u_cameraSettings.x;
    float fieldOfView = u_cameraSettings.y;
    float aspect = u_cameraSettings.z;
    vec2 screenCoord = v_position * vec2(aspect, 1);
    return screenCoord * nearPlane * tan(radians(fieldOfView) / 2.);
}

vec3 GetRayDir(vec2 filmCoord) {
    float nearPlane = u_cameraSettings.x;
    vec3 rightVector = normalize(cross(u_lookVector, vec3(0, 1, 0)));
    vec3 upVector = normalize(cross(rightVector, u_lookVector));
    vec3 lookAtPoint = u_eyePoint + u_lookVector * nearPlane;
    lookAtPoint += filmCoord.x * rightVector;
    lookAtPoint += filmCoord.y * upVector;
    return normalize(lookAtPoint - u_eyePoint);
}

vec2 IntersectSphere(vec3 rayOrigin, vec3 rayDir, vec3 sphereCenter, float sphereRadius) {
    vec3 u = rayOrigin - sphereCenter;
    float b = dot(u, rayDir);
    float c = dot(u, u) - sphereRadius * sphereRadius;
    float h = b * b - c;
    if (h < 0.0) return vec2(-1.0); // no intersection
    h = sqrt(h);
    return vec2(-b - h, -b + h);
}

float DensityAtPoint(vec3 densitySamplePoint) {
    float heightAboveSurface = length(densitySamplePoint - PLANET_CENTER) - PLANET_RAD;
    float heightNormalized = heightAboveSurface / (ATMOSPHERE_RAD - PLANET_RAD);
    float localDensity = exp(-heightNormalized * DENSITY_FALLOFF) * (1.0 - heightNormalized);
    return localDensity;
}

float OpticalDepth(vec3 rayOrigin, vec3 rayDir, float rayLength) {
    vec3 densitySamplePoint = rayOrigin;
    float stepSize = rayLength / float(N_OPTICAL_DEPTH_POINTS - 1);
    float opticalDepth = 0.0;

    for (int i = 0; i < N_OPTICAL_DEPTH_POINTS; i++) {
      float localDensity = DensityAtPoint(densitySamplePoint);
      opticalDepth += localDensity * stepSize;
      densitySamplePoint += rayDir * stepSize;
    }

    return opticalDepth;
}

vec3 CalculateLight(vec3 rayOrigin, vec3 rayDir, float rayLength, vec3 originalColor) {
    vec3 inScatterPoint = rayOrigin;
    vec3 dirToSun = normalize(u_sunPosition - rayOrigin);
    float stepSize = rayLength / float(N_IN_SCATTER_POINTS);
    vec3 inScatteredLight = vec3(0.0);
    float viewRayOpticalDepth = 0.0;

    for (int i = 0; i < N_IN_SCATTER_POINTS; i++) {
        float sunRayLength = IntersectSphere(rayOrigin, rayDir, u_sunPosition, SUN_RADIUS).y;
        float sunRayOpticalDepth = OpticalDepth(inScatterPoint, dirToSun, sunRayLength); 
        viewRayOpticalDepth = OpticalDepth(inScatterPoint, -rayDir, stepSize * float(i));
        float transmittance = exp(-(sunRayOpticalDepth + viewRayOpticalDepth));
        float localDensity = DensityAtPoint(inScatterPoint);
        
        inScatteredLight += localDensity * transmittance * stepSize;
        inScatterPoint += rayDir * stepSize;
    }

    float originalColorTransmittance = exp(-viewRayOpticalDepth);
    return originalColor * originalColorTransmittance + inScatteredLight;
}

void main() {
    vec3 originalColor = vec3(0.2314, 0.2784, 0.7725);

    vec3 rayOrigin = u_eyePoint;
    vec3 rayDir = GetRayDir(GetFilmCoord());

    float dstToSurface = distance(u_eyePoint, PLANET_CENTER + PLANET_RAD);

    vec2 hit = IntersectSphere(rayOrigin, rayDir, PLANET_CENTER, PLANET_RAD);
    float dstToAtmosphere = hit.x;
    float dstThruAtmosphere = min(hit.y, dstToSurface - dstToAtmosphere);

    if (dstThruAtmosphere > 0.0) {
        vec3 pointInAtmosphere = rayOrigin + rayDir * dstToAtmosphere;
        vec3 light = CalculateLight(pointInAtmosphere, rayDir, dstThruAtmosphere, originalColor);
        outColor = vec4(originalColor * (1.0 - light) + light, 1);
        return;
    }

    outColor = vec4(u_lookVector, 1);
}












