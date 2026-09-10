shader_type spatial;
render_mode diffuse_burley, specular_schlick_ggx, cull_disabled;
uniform sampler2D dust_field : filter_linear, repeat_disable;
varying float remaining;
varying vec3 world_position;
vec3 palette(vec3 value) {
	if (OUTPUT_IS_SRGB) { return value; }
	return mix(value / 12.92, pow((value + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), value));
}
void vertex() {
	vec2 center = MODEL_MATRIX[3].xz;
	vec2 uv = (center - vec2(-7.25, -4.09)) / vec2(14.5, 8.64);
	remaining = textureLod(dust_field, clamp(uv, vec2(0.0), vec2(1.0)), 0.0).r;
	float amount = smoothstep(0.025, 0.95, remaining);
	VERTEX.xz *= amount;
	VERTEX.y *= amount;
	world_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}
void fragment() {
	if (remaining < 0.025) { discard; }
	vec2 uv = (world_position.xz - vec2(-7.25, -4.09)) / vec2(14.5, 8.64);
	if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0 || length(world_position.xz) < 1.46) { discard; }
	float grain = fract(sin(dot(floor(world_position.xz * 185.0), vec2(127.1, 311.7))) * 43758.5453);
	ALBEDO = palette(COLOR.rgb * (0.92 + grain * 0.12));
	ROUGHNESS = 1.0;
	SPECULAR = 0.05;
}
