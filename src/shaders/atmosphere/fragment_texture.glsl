#version 300 es

precision highp float;
precision highp sampler3D;

in vec3 view_ray;
out vec4 color;

uniform sampler2D transmittance_texture;
uniform sampler3D scattering_texture;

uniform vec3 camera;
uniform float exposure;
uniform vec3 white_point;
uniform vec3 earth_center;
uniform vec3 sun_direction;
uniform vec2 sun_size;

const int TRANSMITTANCE_TEXTURE_WIDTH = 256;
const int TRANSMITTANCE_TEXTURE_HEIGHT = 64;
const int SCATTERING_TEXTURE_R_SIZE = 32;
const int SCATTERING_TEXTURE_MU_SIZE = 128;
const int SCATTERING_TEXTURE_MU_S_SIZE = 32;
const int SCATTERING_TEXTURE_NU_SIZE = 8;

const float m = 1.0;
const float nm = 1.0;
const float sr = 1.0;
const float watt = 1.0;
const float PI = 3.14159265358979323846;
const float m2 = m * m;
const float watt_per_square_meter_per_sr_per_nm = watt / (m2 * sr * nm);

struct DensityProfileLayer {
    float width;
    float exp_term;
    float exp_scale;
    float linear_term;
    float constant_term;
};

struct DensityProfile {
    DensityProfileLayer layers[2];
};

struct AtmosphereParameters {
    vec3 solar_irradiance;
    float sun_angular_radius;
    float bottom_radius;
    float top_radius;
    DensityProfile rayleigh_density;
    vec3 rayleigh_scattering;
    DensityProfile mie_density;
    vec3 mie_scattering;
    vec3 mie_extinction;
    float mie_phase_function_g;
    DensityProfile absorption_density;
    vec3 absorption_extinction;
    vec3 ground_albedo;
    float mu_s_min;
};

const AtmosphereParameters atmosphere = AtmosphereParameters(
    vec3(1.474000,1.850400,1.911980),
    0.004675,
    6360.000000,
    6420.000000,
    DensityProfile(DensityProfileLayer[2](DensityProfileLayer(0.000000,0.000000,0.000000,0.000000,0.000000),DensityProfileLayer(0.000000,1.000000,-0.125000,0.000000,0.000000))),
    vec3(0.005802,0.013558,0.033100),
    DensityProfile(DensityProfileLayer[2](DensityProfileLayer(0.000000,0.000000,0.000000,0.000000,0.000000),DensityProfileLayer(0.000000,1.000000,-0.833333,0.000000,0.000000))),
    vec3(0.003996,0.003996,0.003996),
    vec3(0.004440,0.004440,0.004440),
    0.800000,
    DensityProfile(DensityProfileLayer[2](DensityProfileLayer(25.000000,0.000000,0.000000,0.066667,-0.666667),DensityProfileLayer(0.000000,0.000000,0.000000,-0.066667,2.666667))),
    vec3(0.000650,0.001881,0.000085),
    vec3(0.100000,0.100000,0.100000),
    -0.207912
);

float ClampDistance(float d) { return max(d, 0.0 * m); }

float SafeSqrt(float a) { return sqrt(max(a, 0.0 * m2)); }

float DistanceToTopAtmosphereBoundary(float r, float mu) {
    float discriminant = r * r * (mu * mu - 1.0) +
    atmosphere.top_radius * atmosphere.top_radius;
    return ClampDistance(-r * mu + SafeSqrt(discriminant));
}

bool RayIntersectsGround(float r, float mu) {
    return mu < 0.0 && r * r * (mu * mu - 1.0) 
          + atmosphere.bottom_radius * atmosphere.bottom_radius >= 0.0 * m2;
}

float GetTextureCoordFromUnitRange(float x, int texture_size) {
    return 0.5 / float(texture_size) + x * (1.0 - 1.0 / float(texture_size));
}

vec2 GetTransmittanceTextureUvFromRMu(float r, float mu) {
    float H = sqrt(
        atmosphere.top_radius * atmosphere.top_radius
        - atmosphere.bottom_radius * atmosphere.bottom_radius
    );
    float rho = SafeSqrt(r * r - atmosphere.bottom_radius * atmosphere.bottom_radius);
    float d = DistanceToTopAtmosphereBoundary(r, mu);
    float d_min = atmosphere.top_radius - r;
    float d_max = rho + H;
    float x_mu = (d - d_min) / (d_max - d_min);
    float x_r = rho / H;
    return vec2(GetTextureCoordFromUnitRange(x_mu, TRANSMITTANCE_TEXTURE_WIDTH),
                GetTextureCoordFromUnitRange(x_r, TRANSMITTANCE_TEXTURE_HEIGHT));
}

vec3 GetTransmittanceToTopAtmosphereBoundary(float r, float mu) {
    vec2 uv = GetTransmittanceTextureUvFromRMu(r, mu);
    return vec3(texture(transmittance_texture, uv));
}

float RayleighPhaseFunction(float nu) {
    float k = 3.0 / (16.0 * PI * sr);
    return k * (1.0 + nu * nu);
}

float MiePhaseFunction(float g, float nu) {
    float k = 3.0 / (8.0 * PI * sr) * (1.0 - g * g) / (2.0 + g * g);
    return k * (1.0 + nu * nu) / pow(1.0 + g * g - 2.0 * g * nu, 1.5);
}

vec4 GetScatteringTextureUvwzFromRMuMuSNu(
        float r, float mu, float mu_s, float nu,
        bool ray_r_mu_intersects_ground) {

    float H = sqrt(atmosphere.top_radius * atmosphere.top_radius - atmosphere.bottom_radius * atmosphere.bottom_radius);
    float rho = SafeSqrt(r * r - atmosphere.bottom_radius * atmosphere.bottom_radius);
    float u_r = GetTextureCoordFromUnitRange(rho / H, SCATTERING_TEXTURE_R_SIZE);
    float r_mu = r * mu;
    float discriminant = r_mu * r_mu - r * r + atmosphere.bottom_radius * atmosphere.bottom_radius;
    float u_mu;

    if (ray_r_mu_intersects_ground) {
        float d = -r_mu - SafeSqrt(discriminant);
        float d_min = r - atmosphere.bottom_radius;
        float d_max = rho;
        u_mu = 0.5 - 0.5 * GetTextureCoordFromUnitRange(d_max == d_min ? 0.0 : 
               (d - d_min) / (d_max - d_min), SCATTERING_TEXTURE_MU_SIZE / 2);
    } else {
        float d = -r_mu + SafeSqrt(discriminant + H * H);
        float d_min = atmosphere.top_radius - r;
        float d_max = rho + H;
        u_mu = 0.5 + 0.5 * GetTextureCoordFromUnitRange((d - d_min) / (d_max - d_min),
                                                        SCATTERING_TEXTURE_MU_SIZE / 2);
    }

    float d = DistanceToTopAtmosphereBoundary(atmosphere.bottom_radius, mu_s);
    float d_min = atmosphere.top_radius - atmosphere.bottom_radius;
    float d_max = H;
    float a = (d - d_min) / (d_max - d_min);
    float D = DistanceToTopAtmosphereBoundary(atmosphere.bottom_radius, atmosphere.mu_s_min);
    float A = (D - d_min) / (d_max - d_min);
    float u_mu_s = GetTextureCoordFromUnitRange(max(1.0 - a / A, 0.0) / (1.0 + a), SCATTERING_TEXTURE_MU_S_SIZE);
    float u_nu = (nu + 1.0) / 2.0;
    return vec4(u_nu, u_mu_s, u_mu, u_r);
}

vec3 GetExtrapolatedSingleMieScattering(const in vec4 scattering) {
    if (scattering.r <= 0.0)
        return vec3(0.0);

    return scattering.rgb * scattering.a / scattering.r
           * (atmosphere.rayleigh_scattering.r / atmosphere.mie_scattering.r)
           * (atmosphere.mie_scattering / atmosphere.rayleigh_scattering);
}

vec3 GetCombinedScattering(
        float r, float mu, float mu_s, float nu,
        bool ray_r_mu_intersects_ground,
        out vec3 single_mie_scattering) {
    vec4 uvwz = GetScatteringTextureUvwzFromRMuMuSNu(r, mu, mu_s, nu, ray_r_mu_intersects_ground);
    float tex_coord_x = uvwz.x * float(SCATTERING_TEXTURE_NU_SIZE - 1);
    float tex_x = floor(tex_coord_x);
    float lerp = tex_coord_x - tex_x;
    vec3 uvw0 = vec3((tex_x + uvwz.y) / float(SCATTERING_TEXTURE_NU_SIZE), uvwz.zw);
    vec3 uvw1 = vec3((tex_x + 1.0 + uvwz.y) / float(SCATTERING_TEXTURE_NU_SIZE), uvwz.zw);
    vec4 combined_scattering = mix(texture(scattering_texture, uvw0),
                                   texture(scattering_texture, uvw1), lerp);
    vec3 scattering = vec3(combined_scattering);
    single_mie_scattering = GetExtrapolatedSingleMieScattering(combined_scattering);
    return scattering;
}

vec3 GetSkyRadiance(
        const in sampler2D transmittance_texture,
        const in sampler3D scattering_texture,
        vec3 camera, const in vec3 view_ray,
        const in vec3 sun_direction, out vec3 transmittance) {
    float r = length(camera);
    float rmu = dot(camera, view_ray);
    float distance_to_top_atmosphere_boundary = -rmu -
        sqrt(rmu * rmu - r * r + atmosphere.top_radius * atmosphere.top_radius);
    if (distance_to_top_atmosphere_boundary > 0.0 * m) {
        camera = camera + view_ray * distance_to_top_atmosphere_boundary;
        r = atmosphere.top_radius;
        rmu += distance_to_top_atmosphere_boundary;
    } else if (r > atmosphere.top_radius) {
        transmittance = vec3(1.0);
        return vec3(0.0 * watt_per_square_meter_per_sr_per_nm);
    }
    float mu = rmu / r;
    float mu_s = dot(camera, sun_direction) / r;
    float nu = dot(view_ray, sun_direction);
    bool ray_r_mu_intersects_ground = RayIntersectsGround(r, mu);
    transmittance = ray_r_mu_intersects_ground ? vec3(0.0) :
        GetTransmittanceToTopAtmosphereBoundary(r, mu);
    vec3 single_mie_scattering;
    vec3 scattering = GetCombinedScattering(r, mu, mu_s, nu, ray_r_mu_intersects_ground, single_mie_scattering);
    return scattering * RayleighPhaseFunction(nu)
           + single_mie_scattering * MiePhaseFunction(atmosphere.mie_phase_function_g, nu);
}

vec3 GetSolarRadiance() {
    return atmosphere.solar_irradiance
           / (PI * atmosphere.sun_angular_radius * atmosphere.sun_angular_radius);
}

vec3 GetSkyRadiance(vec3 camera, vec3 view_ray, vec3 sun_direction, out vec3 transmittance) {
    return GetSkyRadiance(transmittance_texture,
        scattering_texture, 
        camera, view_ray, sun_direction, transmittance);
}

void main() {
    vec3 view_direction = normalize(view_ray);

    float shadow_length = 0.0;
    vec3 transmittance;
    vec3 radiance = GetSkyRadiance(camera - earth_center, view_direction, sun_direction, transmittance);
    if (dot(view_direction, sun_direction) > sun_size.y) {
        radiance = radiance + transmittance * GetSolarRadiance();
    }

    color.rgb = pow(vec3(1.0) - exp(-radiance / white_point * exposure), vec3(1.0 / 2.2));

    float intensity = (transmittance + GetSkyRadiance(camera - earth_center, sun_direction, sun_direction, transmittance) * GetSolarRadiance()).r;
    color.a = intensity;
}

