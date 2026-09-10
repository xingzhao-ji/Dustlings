shader_type spatial;
render_mode cull_back;
uniform float restoration : hint_range(0.0, 1.0) = 0.0;
uniform float motion_amount : hint_range(0.0, 1.0) = 1.0;
uniform float time_seconds = 0.0;
// Tube UV.y runs from the bowl (0) to the basin (1). Source time freezes on pause.
vec3 palette_color(vec3 authored) {
    if (OUTPUT_IS_SRGB) { return authored; }
    return mix(authored / 12.92, pow((authored + vec3(0.055)) / 1.055, vec3(2.4)), step(vec3(0.04045), authored));
}
void fragment() {
    float phase = (UV.y * 3.3 - time_seconds * motion_amount * 1.65) * 6.283185;
    float streak = pow(max(0.0, sin(phase + sin(UV.x * 6.283185) * 0.8)), 6.0);
    float ribbon = 0.30 + 0.70 * pow(max(0.0, cos(UV.x * 12.56637 + 0.6)), 2.0);
    float edge = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 3.0);
    vec3 clear = vec3(0.40, 0.68, 0.64);
    vec3 reflection = vec3(0.78, 0.90, 0.84);
    float sheen = clamp(streak * ribbon + edge * 0.16, 0.0, 1.0);
    ALBEDO = palette_color(mix(clear, reflection, sheen * 0.75));
    ROUGHNESS = 0.18;
    METALLIC = 0.0;
    SPECULAR = 0.70;
    EMISSION = (palette_color(clear) * 0.24 + palette_color(reflection) * streak * ribbon * 0.12) * restoration;
}
