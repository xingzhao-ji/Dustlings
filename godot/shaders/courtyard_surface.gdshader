shader_type spatial;
render_mode diffuse_burley, specular_schlick_ggx;
uniform sampler2D dust_field : filter_linear, repeat_disable;
varying vec3 world_position;
vec3 srgb_to_linear(vec3 value) {
	return mix(value / 12.92, pow((value + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), value));
}
float grain(vec2 p) {
	return fract(sin(dot(floor(p), vec2(127.1, 311.7))) * 43758.5453);
}
void vertex() {
	world_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}
void fragment() {
	vec2 uv = (world_position.xz - vec2(-7.25, -4.09)) / vec2(14.5, 8.64);
	float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
	float amount = texture(dust_field, clamp(uv, vec2(0.0), vec2(1.0))).r * inside;
	float coverage = smoothstep(0.015, 0.95, amount) * 0.91;
	vec3 stone = COLOR.rgb;
	vec3 dust = vec3(0.58, 0.54, 0.465);
	if (!OUTPUT_IS_SRGB) { stone = srgb_to_linear(stone); dust = srgb_to_linear(dust); }
	float detail = grain(world_position.xz * 135.0) * 0.035 + grain(world_position.xz * 11.0) * 0.018;
	ALBEDO = mix(stone * (0.992 + detail * 0.22), dust * (0.976 + detail), coverage);
	ROUGHNESS = mix(0.83, 1.0, coverage);
	SPECULAR = mix(0.28, 0.08, coverage);
}
