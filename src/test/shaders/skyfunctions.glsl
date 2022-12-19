// #version 300 es

precision highp float;
precision highp sampler2D;
precision highp sampler3D;

// in vec3 view_ray;
// out vec4 color;

uniform sampler2D transmittance_texture;
uniform sampler3D scattering_texture;
uniform sampler3D single_mie_scattering_texture;
uniform sampler2D irradiance_texture;

// uniform float exposure;
// uniform vec3 white_point;
// uniform vec3 earth_center;
// uniform vec2 sun_size;

// uniform vec3 sun_direction;

const vec3 camera = vec3(8.90, -0.89, 2.905);
const float kLengthUnitInMeters = 1000.000000;
const vec3 kSphereCenter = vec3(10.0, 10.0, 1.0);
const float kSphereRadius = 1000.0 / kLengthUnitInMeters;
const vec3 kSphereAlbedo = vec3(0.8);
const vec3 kGroundAlbedo = vec3(0.0, 0.0, 0.04);

const float kSunAngularRadius = 0.00935 / 2.0;
const float exposure = 10.0;
const vec3 white_point= vec3(1);
const vec3 earth_center = vec3(0, 0, -6360000.0 / kLengthUnitInMeters);
const vec2 sun_size = vec2(tan(kSunAngularRadius), cos(kSunAngularRadius));

const int TRANSMITTANCE_TEXTURE_WIDTH = 256;
const int TRANSMITTANCE_TEXTURE_HEIGHT = 64;
const int SCATTERING_TEXTURE_R_SIZE = 32;
const int SCATTERING_TEXTURE_MU_SIZE = 128;
const int SCATTERING_TEXTURE_MU_S_SIZE = 32;
const int SCATTERING_TEXTURE_NU_SIZE = 8;
const int IRRADIANCE_TEXTURE_WIDTH = 64;
const int IRRADIANCE_TEXTURE_HEIGHT = 16;
const vec2 IRRADIANCE_TEXTURE_SIZE = vec2(IRRADIANCE_TEXTURE_WIDTH, IRRADIANCE_TEXTURE_HEIGHT);

const float m = 1.0;
const float nm = 1.0;
const float rad = 1.0;
const float sr = 1.0;
const float watt = 1.0;
const float lm = 1.0;
const float PI = 3.14159265358979323846;
const float km = 1000.0 * m;
const float m2 = m * m;
const float m3 = m * m * m;
const float pi = PI * rad;
const float deg = pi / 180.0;
const float watt_per_square_meter = watt / m2;
const float watt_per_square_meter_per_sr = watt / (m2 * sr);
const float watt_per_square_meter_per_nm = watt / (m2 * nm);
const float watt_per_square_meter_per_sr_per_nm = watt / (m2 * sr * nm);
const float watt_per_cubic_meter_per_sr_per_nm = watt / (m3 * sr * nm);
const float cd = lm / sr;
const float kcd = 1000.0 * cd;
const float cd_per_square_meter = cd / m2;
const float kcd_per_square_meter = kcd / m2;

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

const AtmosphereParameters ATMOSPHERE = AtmosphereParameters(
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

const vec3 SKY_SPECTRAL_RADIANCE_TO_LUMINANCE = vec3(114974.916437,71305.954816,65310.548555);
const vec3 SUN_SPECTRAL_RADIANCE_TO_LUMINANCE = vec3(98242.786222,69954.398112,66475.012354);

float ClampCosine(float mu) {
    return clamp(mu, float(-1.0), float(1.0));
}

float ClampDistance(float d) {
    return max(d, 0.0 * m);
}

float ClampRadius(const in AtmosphereParameters atmosphere, float r) {
    return clamp(r, atmosphere.bottom_radius, atmosphere.top_radius);
}

float SafeSqrt(float a) {
    return sqrt(max(a, 0.0 * m2));
}

float DistanceToTopAtmosphereBoundary(const in AtmosphereParameters atmosphere, float r, float mu) {
    float discriminant = r * r * (mu * mu - 1.0) +
    atmosphere.top_radius * atmosphere.top_radius;
    return ClampDistance(-r * mu + SafeSqrt(discriminant));
}

float DistanceToBottomAtmosphereBoundary(const in AtmosphereParameters atmosphere, float r, float mu) {
    float discriminant = r * r * (mu * mu - 1.0) +
    atmosphere.bottom_radius * atmosphere.bottom_radius;
    return ClampDistance(-r * mu - SafeSqrt(discriminant));
}

bool RayIntersectsGround(const in AtmosphereParameters atmosphere, float r, float mu) {
    return mu < 0.0 && r * r * (mu * mu - 1.0) +
    atmosphere.bottom_radius * atmosphere.bottom_radius >= 0.0 * m2;
}

float GetLayerDensity(const in DensityProfileLayer layer, float altitude) {
    float density = layer.exp_term * exp(layer.exp_scale * altitude);
    density += layer.linear_term * altitude + layer.constant_term;
    return clamp(density, float(0.0), float(1.0));
}

float GetProfileDensity(const in DensityProfile profile, float altitude) {
    return altitude < profile.layers[0].width ?
    GetLayerDensity(profile.layers[0], altitude) :
    GetLayerDensity(profile.layers[1], altitude);
}

float ComputeOpticalLengthToTopAtmosphereBoundary(
        const in AtmosphereParameters atmosphere,
        const in DensityProfile profile,
        float r, float mu) {
    const int SAMPLE_COUNT = 500;
    float dx = DistanceToTopAtmosphereBoundary(atmosphere, r, mu) / float(SAMPLE_COUNT);
    float result = 0.0 * m;
    for (int i = 0; i <= SAMPLE_COUNT; ++i) {
        float d_i = float(i) * dx;
        float r_i = sqrt(d_i * d_i + 2.0 * r * mu * d_i + r * r);
        float y_i = GetProfileDensity(profile, r_i - atmosphere.bottom_radius);
        float weight_i = i == 0 || i == SAMPLE_COUNT ? 0.5 : 1.0;
        result += y_i * weight_i * dx;
    }
    return result;
}

vec3 ComputeTransmittanceToTopAtmosphereBoundary(const in AtmosphereParameters atmosphere, float r, float mu) {
    return exp(-(
        atmosphere.rayleigh_scattering * ComputeOpticalLengthToTopAtmosphereBoundary(atmosphere, atmosphere.rayleigh_density, r, mu)
        + atmosphere.mie_extinction * ComputeOpticalLengthToTopAtmosphereBoundary(atmosphere, atmosphere.mie_density, r, mu)
        + atmosphere.absorption_extinction * ComputeOpticalLengthToTopAtmosphereBoundary(atmosphere, atmosphere.absorption_density, r, mu)
    ));
}

float GetTextureCoordFromUnitRange(float x, int texture_size) {
    return 0.5 / float(texture_size) + x * (1.0 - 1.0 / float(texture_size));
}

float GetUnitRangeFromTextureCoord(float u, int texture_size) {
    return (u - 0.5 / float(texture_size)) / (1.0 - 1.0 / float(texture_size));
}

vec2 GetTransmittanceTextureUvFromRMu(const in AtmosphereParameters atmosphere, float r, float mu) {
    float H = sqrt(
        atmosphere.top_radius * atmosphere.top_radius
        - atmosphere.bottom_radius * atmosphere.bottom_radius
    );
    float rho = SafeSqrt(r * r - atmosphere.bottom_radius * atmosphere.bottom_radius);
    float d = DistanceToTopAtmosphereBoundary(atmosphere, r, mu);
    float d_min = atmosphere.top_radius - r;
    float d_max = rho + H;
    float x_mu = (d - d_min) / (d_max - d_min);
    float x_r = rho / H;
    return vec2(GetTextureCoordFromUnitRange(x_mu, TRANSMITTANCE_TEXTURE_WIDTH),
                GetTextureCoordFromUnitRange(x_r, TRANSMITTANCE_TEXTURE_HEIGHT));
}

void GetRMuFromTransmittanceTextureUv(
        const in AtmosphereParameters atmosphere,
        const in vec2 uv, 
        out float r, out float mu) {
    float x_mu = GetUnitRangeFromTextureCoord(uv.x, TRANSMITTANCE_TEXTURE_WIDTH);
    float x_r = GetUnitRangeFromTextureCoord(uv.y, TRANSMITTANCE_TEXTURE_HEIGHT);
    float H = sqrt(atmosphere.top_radius * atmosphere.top_radius - atmosphere.bottom_radius * atmosphere.bottom_radius);
    float rho = H * x_r;
    r = sqrt(rho * rho + atmosphere.bottom_radius * atmosphere.bottom_radius);
    float d_min = atmosphere.top_radius - r;
    float d_max = rho + H;
    float d = d_min + x_mu * (d_max - d_min);
    mu = d == 0.0 * m ? float(1.0) : (H * H - rho * rho - d * d) / (2.0 * r * d);
    mu = ClampCosine(mu);
}

vec3 ComputeTransmittanceToTopAtmosphereBoundaryTexture(const in AtmosphereParameters atmosphere, const in vec2 frag_coord) {
    const vec2 TRANSMITTANCE_TEXTURE_SIZE = vec2(TRANSMITTANCE_TEXTURE_WIDTH, TRANSMITTANCE_TEXTURE_HEIGHT);
    float r;
    float mu;
    GetRMuFromTransmittanceTextureUv(atmosphere, frag_coord / TRANSMITTANCE_TEXTURE_SIZE, r, mu);
    return ComputeTransmittanceToTopAtmosphereBoundary(atmosphere, r, mu);
}

vec3 GetTransmittanceToTopAtmosphereBoundary(
    const in AtmosphereParameters atmosphere,
    const in sampler2D transmittance_texture,
    float r, float mu) {
    vec2 uv = GetTransmittanceTextureUvFromRMu(atmosphere, r, mu);
    return vec3(texture(transmittance_texture, uv));
}

vec3 GetTransmittance(
        const in AtmosphereParameters atmosphere,
        const in sampler2D transmittance_texture,
        float r, float mu, float d, bool ray_r_mu_intersects_ground) {
    float r_d = ClampRadius(atmosphere, sqrt(d * d + 2.0 * r * mu * d + r * r));
    float mu_d = ClampCosine((r * mu + d) / r_d);
    if (ray_r_mu_intersects_ground) {
        return min(
            GetTransmittanceToTopAtmosphereBoundary(atmosphere, transmittance_texture, r_d, -mu_d) 
            / GetTransmittanceToTopAtmosphereBoundary(atmosphere, transmittance_texture, r, -mu),
            vec3(1.0));
    } else {
        return min(
            GetTransmittanceToTopAtmosphereBoundary(atmosphere, transmittance_texture, r, mu)
            / GetTransmittanceToTopAtmosphereBoundary(atmosphere, transmittance_texture, r_d, mu_d),
            vec3(1.0));
    }
}
vec3 GetTransmittanceToSun(
        const in AtmosphereParameters atmosphere,
        const in sampler2D transmittance_texture,
        float r, float mu_s) {
    float sin_theta_h = atmosphere.bottom_radius / r;
    float cos_theta_h = -sqrt(max(1.0 - sin_theta_h * sin_theta_h, 0.0));
    return GetTransmittanceToTopAtmosphereBoundary(atmosphere, transmittance_texture, r, mu_s) *
            smoothstep(-sin_theta_h * atmosphere.sun_angular_radius / rad,
                        sin_theta_h * atmosphere.sun_angular_radius / rad,
                        mu_s - cos_theta_h);
}
void ComputeSingleScatteringIntegrand(
        const in AtmosphereParameters atmosphere,
        const in sampler2D transmittance_texture,
        float r, float mu, float mu_s, float nu, float d,
        bool ray_r_mu_intersects_ground,
        out vec3 rayleigh, out vec3 mie) {
    float r_d = ClampRadius(atmosphere, sqrt(d * d + 2.0 * r * mu * d + r * r));
    float mu_s_d = ClampCosine((r * mu_s + d * nu) / r_d);
    vec3 transmittance =
        GetTransmittance(atmosphere, transmittance_texture, r, mu, d, ray_r_mu_intersects_ground) *
        GetTransmittanceToSun(atmosphere, transmittance_texture, r_d, mu_s_d);
    rayleigh = transmittance * GetProfileDensity(atmosphere.rayleigh_density, r_d - atmosphere.bottom_radius);
    mie = transmittance * GetProfileDensity(atmosphere.mie_density, r_d - atmosphere.bottom_radius);
}

float DistanceToNearestAtmosphereBoundary(
        const in AtmosphereParameters atmosphere,
        float r, float mu, bool ray_r_mu_intersects_ground) {
    if (ray_r_mu_intersects_ground) {
        return DistanceToBottomAtmosphereBoundary(atmosphere, r, mu);
    } else {
        return DistanceToTopAtmosphereBoundary(atmosphere, r, mu);
    }
}

void ComputeSingleScattering(
        const in AtmosphereParameters atmosphere,
        const in sampler2D transmittance_texture,
        float r, float mu, float mu_s, float nu,
        bool ray_r_mu_intersects_ground,
        out vec3 rayleigh, out vec3 mie) {
    const int SAMPLE_COUNT = 50;
    float dx = DistanceToNearestAtmosphereBoundary(atmosphere, r, mu, ray_r_mu_intersects_ground)
               / float(SAMPLE_COUNT);
    vec3 rayleigh_sum = vec3(0.0);
    vec3 mie_sum = vec3(0.0);
    for (int i = 0; i <= SAMPLE_COUNT; ++i) {
        float d_i = float(i) * dx;
        vec3 rayleigh_i;
        vec3 mie_i;
        ComputeSingleScatteringIntegrand(atmosphere, transmittance_texture, r, mu, mu_s, nu, d_i, ray_r_mu_intersects_ground, rayleigh_i, mie_i);
        float weight_i = (i == 0 || i == SAMPLE_COUNT) ? 0.5 : 1.0;
        rayleigh_sum += rayleigh_i * weight_i;
        mie_sum += mie_i * weight_i;
    }
    rayleigh = rayleigh_sum * dx * atmosphere.solar_irradiance *
    atmosphere.rayleigh_scattering;
    mie = mie_sum * dx * atmosphere.solar_irradiance * atmosphere.mie_scattering;
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
        const in AtmosphereParameters atmosphere,
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
        u_mu = 0.5 + 0.5 * GetTextureCoordFromUnitRange((d - d_min) / (d_max - d_min), SCATTERING_TEXTURE_MU_SIZE / 2);
    }
    float d = DistanceToTopAtmosphereBoundary(atmosphere, atmosphere.bottom_radius, mu_s);
    float d_min = atmosphere.top_radius - atmosphere.bottom_radius;
    float d_max = H;
    float a = (d - d_min) / (d_max - d_min);
    float D = DistanceToTopAtmosphereBoundary(atmosphere, atmosphere.bottom_radius, atmosphere.mu_s_min);
    float A = (D - d_min) / (d_max - d_min);
    float u_mu_s = GetTextureCoordFromUnitRange(max(1.0 - a / A, 0.0) / (1.0 + a), SCATTERING_TEXTURE_MU_S_SIZE);
    float u_nu = (nu + 1.0) / 2.0;
    return vec4(u_nu, u_mu_s, u_mu, u_r);
}

void GetRMuMuSNuFromScatteringTextureUvwz(
        const in AtmosphereParameters atmosphere,
        const in vec4 uvwz,
        out float r,
        out float mu,
        out float mu_s,
        out float nu,
        out bool ray_r_mu_intersects_ground) {
    float H = sqrt(atmosphere.top_radius * atmosphere.top_radius - atmosphere.bottom_radius * atmosphere.bottom_radius);
    float rho = H * GetUnitRangeFromTextureCoord(uvwz.w, SCATTERING_TEXTURE_R_SIZE);
    r = sqrt(rho * rho + atmosphere.bottom_radius * atmosphere.bottom_radius);
    if (uvwz.z < 0.5) {
        float d_min = r - atmosphere.bottom_radius;
        float d_max = rho;
        float d = d_min + (d_max - d_min)
                  * GetUnitRangeFromTextureCoord(1.0 - 2.0 * uvwz.z, SCATTERING_TEXTURE_MU_SIZE / 2);
        mu = d == 0.0 * m ? -1.0 : ClampCosine(-(rho * rho + d * d) / (2.0 * r * d));
        ray_r_mu_intersects_ground = true;
    } else {
        float d_min = atmosphere.top_radius - r;
        float d_max = rho + H;
        float d = d_min + (d_max - d_min) * GetUnitRangeFromTextureCoord(
            2.0 * uvwz.z - 1.0, SCATTERING_TEXTURE_MU_SIZE / 2);
        mu = d == 0.0 * m ? 1.0 : ClampCosine((H * H - rho * rho - d * d) / (2.0 * r * d));
        ray_r_mu_intersects_ground = false;
    }
    float x_mu_s = GetUnitRangeFromTextureCoord(uvwz.y, SCATTERING_TEXTURE_MU_S_SIZE);
    float d_min = atmosphere.top_radius - atmosphere.bottom_radius;
    float d_max = H;
    float D = DistanceToTopAtmosphereBoundary(atmosphere, atmosphere.bottom_radius, atmosphere.mu_s_min);
    float A = (D - d_min) / (d_max - d_min);
    float a = (A - x_mu_s * A) / (1.0 + x_mu_s * A);
    float d = d_min + min(a, A) * (d_max - d_min);
    mu_s = d == 0.0 * m ? 1.0 : ClampCosine((H * H - d * d) / (2.0 * atmosphere.bottom_radius * d));
    nu = ClampCosine(uvwz.x * 2.0 - 1.0);
}

void GetRMuMuSNuFromScatteringTextureFragCoord(
        const in AtmosphereParameters atmosphere, const in vec3 frag_coord,
        out float r, out float mu, out float mu_s, out float nu,
        out bool ray_r_mu_intersects_ground) {
    const vec4 SCATTERING_TEXTURE_SIZE = vec4(
        SCATTERING_TEXTURE_NU_SIZE - 1,
        SCATTERING_TEXTURE_MU_S_SIZE,
        SCATTERING_TEXTURE_MU_SIZE,
        SCATTERING_TEXTURE_R_SIZE
    );
    float frag_coord_nu = floor(frag_coord.x / float(SCATTERING_TEXTURE_MU_S_SIZE));
    float frag_coord_mu_s = mod(frag_coord.x, float(SCATTERING_TEXTURE_MU_S_SIZE));
    vec4 uvwz = vec4(frag_coord_nu, frag_coord_mu_s, frag_coord.y, frag_coord.z) 
                / SCATTERING_TEXTURE_SIZE;
    GetRMuMuSNuFromScatteringTextureUvwz(atmosphere, uvwz, r, mu, mu_s, nu, ray_r_mu_intersects_ground);
    nu = clamp(nu, mu * mu_s - sqrt((1.0 - mu * mu) * (1.0 - mu_s * mu_s)),
               mu * mu_s + sqrt((1.0 - mu * mu) * (1.0 - mu_s * mu_s)));
}

void ComputeSingleScatteringTexture(
        const in AtmosphereParameters atmosphere,
        const in sampler2D transmittance_texture, const in vec3 frag_coord,
        out vec3 rayleigh, out vec3 mie) {
    float r;
    float mu;
    float mu_s;
    float nu;
    bool ray_r_mu_intersects_ground;
    GetRMuMuSNuFromScatteringTextureFragCoord(atmosphere, frag_coord, r, mu, mu_s, nu, ray_r_mu_intersects_ground);
    ComputeSingleScattering(atmosphere, transmittance_texture, r, mu, mu_s, nu, ray_r_mu_intersects_ground, rayleigh, mie);
}

vec3 GetScattering(
        const in AtmosphereParameters atmosphere,
        const in sampler3D scattering_texture,
        float r, float mu, float mu_s, float nu,
        bool ray_r_mu_intersects_ground) {
    vec4 uvwz = GetScatteringTextureUvwzFromRMuMuSNu(atmosphere, r, mu, mu_s, nu, ray_r_mu_intersects_ground);
    float tex_coord_x = uvwz.x * float(SCATTERING_TEXTURE_NU_SIZE - 1);
    float tex_x = floor(tex_coord_x);
    float lerp = tex_coord_x - tex_x;
    vec3 uvw0 = vec3((tex_x + uvwz.y) / float(SCATTERING_TEXTURE_NU_SIZE), uvwz.zw);
    vec3 uvw1 = vec3((tex_x + 1.0 + uvwz.y) / float(SCATTERING_TEXTURE_NU_SIZE), uvwz.zw);
    return vec3(texture(scattering_texture, uvw0) * (1.0 - lerp) 
           + texture(scattering_texture, uvw1) * lerp);
}

vec3 GetScattering(
        const in AtmosphereParameters atmosphere,
        const in sampler3D single_rayleigh_scattering_texture,
        const in sampler3D single_mie_scattering_texture,
        const in sampler3D multiple_scattering_texture,
        float r, float mu, float mu_s, float nu,
        bool ray_r_mu_intersects_ground,
        int scattering_order) {
    if (scattering_order == 1) {
        vec3 rayleigh = GetScattering(atmosphere, single_rayleigh_scattering_texture, r, mu, mu_s, nu, ray_r_mu_intersects_ground);
        vec3 mie = GetScattering(atmosphere, single_mie_scattering_texture, r, mu, mu_s, nu, ray_r_mu_intersects_ground);
        return rayleigh * RayleighPhaseFunction(nu)
               + mie * MiePhaseFunction(atmosphere.mie_phase_function_g, nu);
    } else {
        return GetScattering(atmosphere, multiple_scattering_texture, r, mu, mu_s, nu, ray_r_mu_intersects_ground);
    }
}

vec3 GetIrradiance(
    const in AtmosphereParameters atmosphere,
    const in sampler2D irradiance_texture,
    float r, float mu_s
);

vec3 ComputeScatteringDensity(
        const in AtmosphereParameters atmosphere,
        const in sampler2D transmittance_texture,
        const in sampler3D single_rayleigh_scattering_texture,
        const in sampler3D single_mie_scattering_texture,
        const in sampler3D multiple_scattering_texture,
        const in sampler2D irradiance_texture,
        float r, float mu, float mu_s, float nu, int scattering_order) {
    vec3 zenith_direction = vec3(0.0, 0.0, 1.0);
    vec3 omega = vec3(sqrt(1.0 - mu * mu), 0.0, mu);
    float sun_dir_x = omega.x == 0.0 ? 0.0 : (nu - mu * mu_s) / omega.x;
    float sun_dir_y = sqrt(max(1.0 - sun_dir_x * sun_dir_x - mu_s * mu_s, 0.0));
    vec3 omega_s = vec3(sun_dir_x, sun_dir_y, mu_s);
    const int SAMPLE_COUNT = 16;
    const float dphi = pi / float(SAMPLE_COUNT);
    const float dtheta = pi / float(SAMPLE_COUNT);
    vec3 rayleigh_mie = vec3(0.0 * watt_per_cubic_meter_per_sr_per_nm);
    for (int l = 0; l < SAMPLE_COUNT; ++l) {
        float theta = (float(l) + 0.5) * dtheta;
        float cos_theta = cos(theta);
        float sin_theta = sin(theta);
        bool ray_r_theta_intersects_ground = RayIntersectsGround(atmosphere, r, cos_theta);
        float distance_to_ground = 0.0 * m;
        vec3 transmittance_to_ground = vec3(0.0);
        vec3 ground_albedo = vec3(0.0);
        if (ray_r_theta_intersects_ground) {
            distance_to_ground = DistanceToBottomAtmosphereBoundary(atmosphere, r, cos_theta);
            transmittance_to_ground = GetTransmittance(atmosphere, transmittance_texture, r, cos_theta, distance_to_ground, true /* ray_intersects_ground */);
            ground_albedo = atmosphere.ground_albedo;
        }
        for (int m = 0; m < 2 * SAMPLE_COUNT; ++m) {
        float phi = (float(m) + 0.5) * dphi;
        vec3 omega_i = vec3(cos(phi) * sin_theta, sin(phi) * sin_theta, cos_theta);
        float domega_i = (dtheta / rad) * (dphi / rad) * sin(theta) * sr;
        float nu1 = dot(omega_s, omega_i);
        vec3 incident_radiance = GetScattering(atmosphere, single_rayleigh_scattering_texture, single_mie_scattering_texture, multiple_scattering_texture, r, omega_i.z, mu_s, nu1, ray_r_theta_intersects_ground, scattering_order - 1);
        vec3 ground_normal = normalize(zenith_direction * r + omega_i * distance_to_ground);
        vec3 ground_irradiance = GetIrradiance(atmosphere, irradiance_texture, atmosphere.bottom_radius, dot(ground_normal, omega_s));
        incident_radiance += transmittance_to_ground 
                             * ground_albedo * (1.0 / (PI * sr))
                             * ground_irradiance;
        float nu2 = dot(omega, omega_i);
        float rayleigh_density = GetProfileDensity(atmosphere.rayleigh_density, r - atmosphere.bottom_radius);
        float mie_density = GetProfileDensity(atmosphere.mie_density, r - atmosphere.bottom_radius);
        rayleigh_mie += incident_radiance * domega_i
                        * (atmosphere.rayleigh_scattering * rayleigh_density * RayleighPhaseFunction(nu2)
                           + atmosphere.mie_scattering * mie_density * MiePhaseFunction(atmosphere.mie_phase_function_g, nu2));
        }
    }
    return rayleigh_mie;
}

vec3 ComputeMultipleScattering(
        const in AtmosphereParameters atmosphere,
        const in sampler2D transmittance_texture,
        const in sampler3D scattering_density_texture,
        float r, float mu, float mu_s, float nu,
        bool ray_r_mu_intersects_ground) {
    const int SAMPLE_COUNT = 50;
    float dx = DistanceToNearestAtmosphereBoundary(atmosphere, r, mu, ray_r_mu_intersects_ground)
               / float(SAMPLE_COUNT);
    vec3 rayleigh_mie_sum = vec3(0.0 * watt_per_square_meter_per_sr_per_nm);
    for (int i = 0; i <= SAMPLE_COUNT; ++i) {
        float d_i = float(i) * dx;
        float r_i = ClampRadius(atmosphere, sqrt(d_i * d_i + 2.0 * r * mu * d_i + r * r));
        float mu_i = ClampCosine((r * mu + d_i) / r_i);
        float mu_s_i = ClampCosine((r * mu_s + d_i * nu) / r_i);
        vec3 rayleigh_mie_i = GetScattering(atmosphere, scattering_density_texture, r_i, mu_i, mu_s_i, nu, ray_r_mu_intersects_ground)
                              * GetTransmittance(atmosphere, transmittance_texture, r, mu, d_i, ray_r_mu_intersects_ground)
                              * dx;
        float weight_i = (i == 0 || i == SAMPLE_COUNT) ? 0.5 : 1.0;
        rayleigh_mie_sum += rayleigh_mie_i * weight_i;
    }
    return rayleigh_mie_sum;
}
vec3 ComputeScatteringDensityTexture(
        const in AtmosphereParameters atmosphere,
        const in sampler2D transmittance_texture,
        const in sampler3D single_rayleigh_scattering_texture,
        const in sampler3D single_mie_scattering_texture,
        const in sampler3D multiple_scattering_texture,
        const in sampler2D irradiance_texture,
        const in vec3 frag_coord, int scattering_order) {
    float r;
    float mu;
    float mu_s;
    float nu;
    bool ray_r_mu_intersects_ground;
    GetRMuMuSNuFromScatteringTextureFragCoord(atmosphere, frag_coord, r, mu, mu_s, nu, ray_r_mu_intersects_ground);
    return ComputeScatteringDensity(atmosphere, transmittance_texture, 
        single_rayleigh_scattering_texture, single_mie_scattering_texture,
        multiple_scattering_texture, irradiance_texture,
        r, mu, mu_s, nu, scattering_order
    );
}

vec3 ComputeMultipleScatteringTexture(
        const in AtmosphereParameters atmosphere,
        const in sampler2D transmittance_texture,
        const in sampler3D scattering_density_texture,
        const in vec3 frag_coord, out float nu) {
    float r;
    float mu;
    float mu_s;
    bool ray_r_mu_intersects_ground;
    GetRMuMuSNuFromScatteringTextureFragCoord(atmosphere, frag_coord,
        r, mu, mu_s, nu, ray_r_mu_intersects_ground);
    return ComputeMultipleScattering(atmosphere, transmittance_texture,
        scattering_density_texture, r, mu, mu_s, nu,
        ray_r_mu_intersects_ground);
}
vec3 ComputeDirectIrradiance(
    const in AtmosphereParameters atmosphere,
    const in sampler2D transmittance_texture,
    float r, float mu_s) {
    float alpha_s = atmosphere.sun_angular_radius / rad;
    float average_cosine_factor =
        mu_s < -alpha_s ? 0.0 : (mu_s > alpha_s ? mu_s :
            (mu_s + alpha_s) * (mu_s + alpha_s) / (4.0 * alpha_s));
    return atmosphere.solar_irradiance *
        GetTransmittanceToTopAtmosphereBoundary(
            atmosphere, transmittance_texture, r, mu_s) * average_cosine_factor;
}

vec3 ComputeIndirectIrradiance(
    const in AtmosphereParameters atmosphere,
    const in sampler3D single_rayleigh_scattering_texture,
    const in sampler3D single_mie_scattering_texture,
    const in sampler3D multiple_scattering_texture,
    float r, float mu_s, int scattering_order) {
        const int SAMPLE_COUNT = 32;
    const float dphi = pi / float(SAMPLE_COUNT);
    const float dtheta = pi / float(SAMPLE_COUNT);
    vec3 result = vec3(0.0 * watt_per_square_meter_per_nm);
    vec3 omega_s = vec3(sqrt(1.0 - mu_s * mu_s), 0.0, mu_s);
    for (int j = 0; j < SAMPLE_COUNT / 2; ++j) {
        float theta = (float(j) + 0.5) * dtheta;
        for (int i = 0; i < 2 * SAMPLE_COUNT; ++i) {
        float phi = (float(i) + 0.5) * dphi;
        vec3 omega = vec3(cos(phi) * sin(theta), sin(phi) * sin(theta), cos(theta));
        float domega = (dtheta / rad) * (dphi / rad) * sin(theta) * sr;
        float nu = dot(omega, omega_s);
        result += GetScattering(atmosphere, single_rayleigh_scattering_texture,
            single_mie_scattering_texture, multiple_scattering_texture,
            r, omega.z, mu_s, nu, false /* ray_r_theta_intersects_ground */,
            scattering_order) *
                omega.z * domega;
        }
    }
    return result;
}

vec2 GetIrradianceTextureUvFromRMuS(const in AtmosphereParameters atmosphere,
    float r, float mu_s) {
    float x_r = (r - atmosphere.bottom_radius) / (atmosphere.top_radius - atmosphere.bottom_radius);
    float x_mu_s = mu_s * 0.5 + 0.5;
    return vec2(GetTextureCoordFromUnitRange(x_mu_s, IRRADIANCE_TEXTURE_WIDTH),
                GetTextureCoordFromUnitRange(x_r, IRRADIANCE_TEXTURE_HEIGHT));
}

void GetRMuSFromIrradianceTextureUv(
        const in AtmosphereParameters atmosphere,
        const in vec2 uv, out float r, out float mu_s) {
    float x_mu_s = GetUnitRangeFromTextureCoord(uv.x, IRRADIANCE_TEXTURE_WIDTH);
    float x_r = GetUnitRangeFromTextureCoord(uv.y, IRRADIANCE_TEXTURE_HEIGHT);
    r = atmosphere.bottom_radius + x_r * (atmosphere.top_radius - atmosphere.bottom_radius);
    mu_s = ClampCosine(2.0 * x_mu_s - 1.0);
}

vec3 ComputeDirectIrradianceTexture(
        const in AtmosphereParameters atmosphere,
        const in sampler2D transmittance_texture,
        const in vec2 frag_coord) {
    float r;
    float mu_s;
    GetRMuSFromIrradianceTextureUv(
        atmosphere, frag_coord / IRRADIANCE_TEXTURE_SIZE, r, mu_s);
    return ComputeDirectIrradiance(atmosphere, transmittance_texture, r, mu_s);
}

vec3 ComputeIndirectIrradianceTexture(
        const in AtmosphereParameters atmosphere,
        const in sampler3D single_rayleigh_scattering_texture,
        const in sampler3D single_mie_scattering_texture,
        const in sampler3D multiple_scattering_texture,
        const in vec2 frag_coord, int scattering_order) {
    float r;
    float mu_s;
    GetRMuSFromIrradianceTextureUv(
        atmosphere, frag_coord / IRRADIANCE_TEXTURE_SIZE, r, mu_s);
    return ComputeIndirectIrradiance(atmosphere,
        single_rayleigh_scattering_texture, single_mie_scattering_texture,
        multiple_scattering_texture, r, mu_s, scattering_order);
    }
    vec3 GetIrradiance(
        const in AtmosphereParameters atmosphere,
        const in sampler2D irradiance_texture,
        float r, float mu_s) {
    vec2 uv = GetIrradianceTextureUvFromRMuS(atmosphere, r, mu_s);
    return vec3(texture(irradiance_texture, uv));
    }
    vec3 GetExtrapolatedSingleMieScattering(
        const in AtmosphereParameters atmosphere, const in vec4 scattering) {
    if (scattering.r <= 0.0) {
        return vec3(0.0);
    }
    return scattering.rgb * scattering.a / scattering.r *
            (atmosphere.rayleigh_scattering.r / atmosphere.mie_scattering.r) *
            (atmosphere.mie_scattering / atmosphere.rayleigh_scattering);
}

vec3 GetCombinedScattering(
        const in AtmosphereParameters atmosphere,
        const in sampler3D scattering_texture,
        const in sampler3D single_mie_scattering_texture,
        float r, float mu, float mu_s, float nu,
        bool ray_r_mu_intersects_ground,
        out vec3 single_mie_scattering) {
    vec4 uvwz = GetScatteringTextureUvwzFromRMuMuSNu(
        atmosphere, r, mu, mu_s, nu, ray_r_mu_intersects_ground);
    float tex_coord_x = uvwz.x * float(SCATTERING_TEXTURE_NU_SIZE - 1);
    float tex_x = floor(tex_coord_x);
    float lerp = tex_coord_x - tex_x;
    vec3 uvw0 = vec3((tex_x + uvwz.y) / float(SCATTERING_TEXTURE_NU_SIZE),
        uvwz.z, uvwz.w);
    vec3 uvw1 = vec3((tex_x + 1.0 + uvwz.y) / float(SCATTERING_TEXTURE_NU_SIZE),
        uvwz.z, uvwz.w);
    vec4 combined_scattering =
        texture(scattering_texture, uvw0) * (1.0 - lerp) +
        texture(scattering_texture, uvw1) * lerp;
    vec3 scattering = vec3(combined_scattering);
    single_mie_scattering =
        GetExtrapolatedSingleMieScattering(atmosphere, combined_scattering);
    return scattering;
}

vec3 GetSkyRadiance(
        const in AtmosphereParameters atmosphere,
        const in sampler2D transmittance_texture,
        const in sampler3D scattering_texture,
        const in sampler3D single_mie_scattering_texture,
        vec3 camera, const in vec3 view_ray, float shadow_length,
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
    bool ray_r_mu_intersects_ground = RayIntersectsGround(atmosphere, r, mu);
    transmittance = ray_r_mu_intersects_ground ? vec3(0.0) :
        GetTransmittanceToTopAtmosphereBoundary(
            atmosphere, transmittance_texture, r, mu);
    vec3 single_mie_scattering;
    vec3 scattering;
    if (shadow_length == 0.0 * m) {
        scattering = GetCombinedScattering(
            atmosphere, scattering_texture, single_mie_scattering_texture,
            r, mu, mu_s, nu, ray_r_mu_intersects_ground,
            single_mie_scattering);
    } else {
        float d = shadow_length;
        float r_p =
            ClampRadius(atmosphere, sqrt(d * d + 2.0 * r * mu * d + r * r));
        float mu_p = (r * mu + d) / r_p;
        float mu_s_p = (r * mu_s + d * nu) / r_p;
        scattering = GetCombinedScattering(
            atmosphere, scattering_texture, single_mie_scattering_texture,
            r_p, mu_p, mu_s_p, nu, ray_r_mu_intersects_ground,
            single_mie_scattering);
        vec3 shadow_transmittance =
            GetTransmittance(atmosphere, transmittance_texture,
                r, mu, shadow_length, ray_r_mu_intersects_ground);
        scattering = scattering * shadow_transmittance;
        single_mie_scattering = single_mie_scattering * shadow_transmittance;
    }
    return scattering * RayleighPhaseFunction(nu) + single_mie_scattering *
        MiePhaseFunction(atmosphere.mie_phase_function_g, nu);
}

vec3 GetSkyRadianceToPoint(
    const in AtmosphereParameters atmosphere,
    const in sampler2D transmittance_texture,
    const in sampler3D scattering_texture,
    const in sampler3D single_mie_scattering_texture,
    vec3 camera, const in vec3 point, float shadow_length,
    const in vec3 sun_direction, out vec3 transmittance) {
    vec3 view_ray = normalize(point - camera);
    float r = length(camera);
    float rmu = dot(camera, view_ray);
    float distance_to_top_atmosphere_boundary = -rmu -
        sqrt(rmu * rmu - r * r + atmosphere.top_radius * atmosphere.top_radius);
    if (distance_to_top_atmosphere_boundary > 0.0 * m) {
        camera = camera + view_ray * distance_to_top_atmosphere_boundary;
        r = atmosphere.top_radius;
        rmu += distance_to_top_atmosphere_boundary;
    }
    float mu = rmu / r;
    float mu_s = dot(camera, sun_direction) / r;
    float nu = dot(view_ray, sun_direction);
    float d = length(point - camera);
    bool ray_r_mu_intersects_ground = RayIntersectsGround(atmosphere, r, mu);
    transmittance = GetTransmittance(atmosphere, transmittance_texture,
        r, mu, d, ray_r_mu_intersects_ground);
    vec3 single_mie_scattering;
    vec3 scattering = GetCombinedScattering(
        atmosphere, scattering_texture, single_mie_scattering_texture,
        r, mu, mu_s, nu, ray_r_mu_intersects_ground,
        single_mie_scattering);
    d = max(d - shadow_length, 0.0 * m);
    float r_p = ClampRadius(atmosphere, sqrt(d * d + 2.0 * r * mu * d + r * r));
    float mu_p = (r * mu + d) / r_p;
    float mu_s_p = (r * mu_s + d * nu) / r_p;
    vec3 single_mie_scattering_p;
    vec3 scattering_p = GetCombinedScattering(
        atmosphere, scattering_texture, single_mie_scattering_texture,
        r_p, mu_p, mu_s_p, nu, ray_r_mu_intersects_ground,
        single_mie_scattering_p);
    vec3 shadow_transmittance = transmittance;
    if (shadow_length > 0.0 * m) {
        shadow_transmittance = GetTransmittance(atmosphere, transmittance_texture,
            r, mu, d, ray_r_mu_intersects_ground);
    }
    scattering = scattering - shadow_transmittance * scattering_p;
    single_mie_scattering =
        single_mie_scattering - shadow_transmittance * single_mie_scattering_p;
    single_mie_scattering = GetExtrapolatedSingleMieScattering(
        atmosphere, vec4(scattering, single_mie_scattering.r));
    single_mie_scattering = single_mie_scattering *
        smoothstep(float(0.0), float(0.01), mu_s);
    return scattering * RayleighPhaseFunction(nu) + single_mie_scattering *
        MiePhaseFunction(atmosphere.mie_phase_function_g, nu);
}

vec3 GetSunAndSkyIrradiance(
        const in AtmosphereParameters atmosphere,
        const in sampler2D transmittance_texture,
        const in sampler2D irradiance_texture,
        const in vec3 point, const in vec3 normal, const in vec3 sun_direction,
        out vec3 sky_irradiance) {
    float r = length(point);
    float mu_s = dot(point, sun_direction) / r;
    sky_irradiance = GetIrradiance(atmosphere, irradiance_texture, r, mu_s) *
        (1.0 + dot(normal, point) / r) * 0.5;
    return atmosphere.solar_irradiance *
        GetTransmittanceToSun(atmosphere, transmittance_texture, r, mu_s) *
        max(dot(normal, sun_direction), 0.0);
}

vec3 GetSolarRadiance() {
    return ATMOSPHERE.solar_irradiance /
        (PI * ATMOSPHERE.sun_angular_radius * ATMOSPHERE.sun_angular_radius);
}

vec3 GetSkyRadiance(
    vec3 camera, vec3 view_ray, float shadow_length,
    vec3 sun_direction, out vec3 transmittance) {
    return GetSkyRadiance(ATMOSPHERE, transmittance_texture,
        scattering_texture, single_mie_scattering_texture,
        camera, view_ray, shadow_length, sun_direction, transmittance);
}

vec3 GetSkyRadianceToPoint(
    vec3 camera, vec3 point, float shadow_length,
    vec3 sun_direction, out vec3 transmittance) {
    return GetSkyRadianceToPoint(ATMOSPHERE, transmittance_texture,
        scattering_texture, single_mie_scattering_texture,
        camera, point, shadow_length, sun_direction, transmittance);
}

vec3 GetSunAndSkyIrradiance(
    vec3 p, vec3 normal, vec3 sun_direction,
    out vec3 sky_irradiance) {
    return GetSunAndSkyIrradiance(ATMOSPHERE, transmittance_texture,
        irradiance_texture, p, normal, sun_direction, sky_irradiance);
}

vec3 GetSolarLuminance() {
    return ATMOSPHERE.solar_irradiance /
        (PI * ATMOSPHERE.sun_angular_radius * ATMOSPHERE.sun_angular_radius) *
        SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
}

vec3 GetSkyLuminance(
    vec3 camera, vec3 view_ray, float shadow_length,
    vec3 sun_direction, out vec3 transmittance) {
    return GetSkyRadiance(ATMOSPHERE, transmittance_texture,
        scattering_texture, single_mie_scattering_texture,
        camera, view_ray, shadow_length, sun_direction, transmittance) *
        SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;
}

vec3 GetSkyLuminanceToPoint(
    vec3 camera, vec3 point, float shadow_length,
    vec3 sun_direction, out vec3 transmittance) {
    return GetSkyRadianceToPoint(ATMOSPHERE, transmittance_texture,
        scattering_texture, single_mie_scattering_texture,
        camera, point, shadow_length, sun_direction, transmittance) *
        SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;
}

vec3 GetSunAndSkyIlluminance(
    vec3 p, vec3 normal, vec3 sun_direction,
    out vec3 sky_irradiance) {
    vec3 sun_irradiance = GetSunAndSkyIrradiance(
        ATMOSPHERE, transmittance_texture, irradiance_texture, p, normal,
        sun_direction, sky_irradiance);
    sky_irradiance *= SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;
    return sun_irradiance * SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
}


float GetSunVisibility(vec3 point, vec3 sun_direction) {
    vec3 p = point - kSphereCenter;
    float p_dot_v = dot(p, sun_direction);
    float p_dot_p = dot(p, p);
    float ray_sphere_center_squared_distance = p_dot_p - p_dot_v * p_dot_v;
    float distance_to_intersection = -p_dot_v - sqrt(kSphereRadius * kSphereRadius - ray_sphere_center_squared_distance);
    if (distance_to_intersection > 0.0) {
        float ray_sphere_distance = kSphereRadius - sqrt(ray_sphere_center_squared_distance);
        float ray_sphere_angular_distance = -ray_sphere_distance / p_dot_v;
        return smoothstep(1.0, 0.0, ray_sphere_angular_distance / sun_size.x);
    }
    return 1.0;
}

float GetSkyVisibility(vec3 point) {
    vec3 p = point - kSphereCenter;
    float p_dot_p = dot(p, p);
    return 1.0 + p.z / sqrt(p_dot_p) * kSphereRadius * kSphereRadius / p_dot_p;
}

void GetSphereShadowInOut(vec3 view_direction, vec3 sun_direction, out float d_in, out float d_out) {
    vec3 pos = camera - kSphereCenter;
    float pos_dot_sun = dot(pos, sun_direction);
    float view_dot_sun = dot(view_direction, sun_direction);
    float k = sun_size.x;
    float l = 1.0 + k * k;
    float a = 1.0 - l * view_dot_sun * view_dot_sun;
    float b = dot(pos, view_direction) - l * pos_dot_sun * view_dot_sun -
        k * kSphereRadius * view_dot_sun;
    float c = dot(pos, pos) - l * pos_dot_sun * pos_dot_sun -
        2.0 * k * kSphereRadius * pos_dot_sun - kSphereRadius * kSphereRadius;
    float discriminant = b * b - a * c;
    if (discriminant > 0.0) {
        d_in = max(0.0, (-b - sqrt(discriminant)) / a);
        d_out = (-b + sqrt(discriminant)) / a;
        float d_base = -pos_dot_sun / view_dot_sun;
        float d_apex = -(pos_dot_sun + kSphereRadius / k) / view_dot_sun;
        if (view_dot_sun > 0.0) {
        d_in = max(d_in, d_apex);
        d_out = a > 0.0 ? min(d_out, d_base) : d_base;
        } else {
        d_in = a > 0.0 ? max(d_in, d_base) : d_base;
        d_out = min(d_out, d_apex);
        }
    } else {
        d_in = 0.0;
        d_out = 0.0;
    }
}

vec3 SkyGetBackgroundSkyColor(vec3 eyePosition, vec3 rayDirection, vec3 sunDirection) {
    vec3 transmittance;
    sunDirection = normalize(sunDirection.xzy);
    rayDirection = normalize(rayDirection.xzy);
    vec3 radiance = GetSkyRadiance(eyePosition.xzy - earth_center, rayDirection, 0.0, sunDirection, transmittance);
    if (dot(rayDirection, sunDirection) > sun_size.y) {
        radiance = radiance + transmittance * GetSolarRadiance();
    }
    return radiance;
}

vec3 SkyGetLightAtPoint(vec3 point, vec3 normal, vec3 sunDirection, vec3 albedo) {
    // point = point.xzy;
    // normal = normal.xzy;
    // sunDirection = -sunDirection.xzy;
    vec3 sky_irradiance;
    vec3 sun_irradiance = GetSunAndSkyIrradiance(point - earth_center, normal, sunDirection, sky_irradiance);
    vec3 irradiance = albedo * (1.0 / PI) * (sun_irradiance + sky_irradiance);
    float shadow_length = 0.0;
    vec3 transmittance;
    vec3 in_scatter = GetSkyRadianceToPoint(camera - earth_center, point - earth_center, 0.0, sunDirection, transmittance);
    return irradiance * transmittance + in_scatter;
}

vec4 CorrectGamma(vec3 in_color) {
  vec4 color;
  color.rgb = pow(vec3(1.0) - exp(-in_color / white_point * exposure), vec3(1.0 / 2.2));
  color.a = 1.0;
  return color;
}

// void main() {
//     vec3 view_direction = GetRayDirection();
//     vec3 sun_direction = normalize(u_sunDirection);
//     vec3 view_ray = view_direction;
//     float fragment_angular_size = length(dFdx(view_ray) + dFdy(view_ray)) / length(view_ray);

//     float shadow_in;
//     float shadow_out;
//     GetSphereShadowInOut(view_direction, sun_direction, shadow_in, shadow_out);
//     float lightshaft_fadein_hack = smoothstep(0.02, 0.04, dot(normalize(camera - earth_center), sun_direction));
//     vec3 p = camera - kSphereCenter;
//     float p_dot_v = dot(p, view_direction);
//     float p_dot_p = dot(p, p);
//     float ray_sphere_center_squared_distance = p_dot_p - p_dot_v * p_dot_v;
//     float distance_to_intersection = -p_dot_v - sqrt(kSphereRadius * kSphereRadius - ray_sphere_center_squared_distance);
//     float sphere_alpha = 0.0;
//     vec3 sphere_radiance = vec3(0.0);

//     if (distance_to_intersection > 0.0) {
//         float ray_sphere_distance = kSphereRadius - sqrt(ray_sphere_center_squared_distance);
//         float ray_sphere_angular_distance = -ray_sphere_distance / p_dot_v;
//         sphere_alpha = min(ray_sphere_angular_distance / fragment_angular_size, 1.0);
//         vec3 point = camera + view_direction * distance_to_intersection;
//         vec3 normal = normalize(point - kSphereCenter);
//         vec3 sky_irradiance;
//         vec3 sun_irradiance = GetSunAndSkyIrradiance(point - earth_center, normal, sun_direction, sky_irradiance);
//         sphere_radiance = kSphereAlbedo * (1.0 / PI) * (sun_irradiance + sky_irradiance);
//         float shadow_length = 0.0;
//         vec3 transmittance;
//         vec3 in_scatter = GetSkyRadianceToPoint(camera - earth_center, point - earth_center, shadow_length, sun_direction, transmittance);
//         sphere_radiance = sphere_radiance * transmittance + in_scatter;
//         sphere_radiance = SkyGetLightAtPoint(vec3(-20, 1, 10), normal, sun_direction, kSphereAlbedo);
//     }

//     p = camera - earth_center;
//     p_dot_v = dot(p, view_direction);
//     p_dot_p = dot(p, p);
//     float ray_earth_center_squared_distance = p_dot_p - p_dot_v * p_dot_v;
//     distance_to_intersection = -p_dot_v - sqrt(
//         earth_center.z * earth_center.z - ray_earth_center_squared_distance);
//     float ground_alpha = 0.0;
//     vec3 ground_radiance = vec3(0.0);
//     if (distance_to_intersection > 0.0) {
//         vec3 point = camera + view_direction * distance_to_intersection;
//         vec3 normal = normalize(point - earth_center);
//         vec3 sky_irradiance;
//         vec3 sun_irradiance = GetSunAndSkyIrradiance(point - earth_center, normal, sun_direction, sky_irradiance);
//         ground_radiance = sun_irradiance * GetSunVisibility(point, sun_direction);
//         ground_radiance += sky_irradiance * GetSkyVisibility(point);
//         ground_radiance *= kGroundAlbedo * (1.0 / PI);
//         float shadow_length = max(0.0, min(shadow_out, distance_to_intersection) - shadow_in) * lightshaft_fadein_hack;
//         vec3 transmittance;
//         vec3 in_scatter = GetSkyRadianceToPoint(camera - earth_center, point - earth_center, shadow_length, sun_direction, transmittance);
//         ground_radiance = ground_radiance * transmittance + in_scatter;
//         ground_alpha = 1.0;
//     }

//     float shadow_length = max(0.0, shadow_out - shadow_in) * lightshaft_fadein_hack;
//     vec3 transmittance;
//     vec3 radiance = GetSkyRadiance(camera - earth_center, view_direction, 0.0, sun_direction, transmittance);
//     if (dot(view_direction, sun_direction) > sun_size.y) {
//         radiance = radiance + transmittance * GetSolarRadiance();
//     }

//     radiance = SkyGetBackgroundSkyColor(view_direction, sun_direction);

//     radiance = mix(radiance, ground_radiance, ground_alpha);
//     radiance = mix(radiance, sphere_radiance, sphere_alpha);
//     color.rgb = pow(vec3(1.0) - exp(-radiance / white_point * exposure), vec3(1.0 / 2.2));
//     color.a = 1.0;
// }


