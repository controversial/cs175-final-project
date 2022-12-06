
function loadShaderSource(filepath) {
    var req = new XMLHttpRequest();
    req.open('GET', filepath, false);
    req.send(null);
    return (req.status == 200) ? req.responseText : null;
};

function makeShader(gl, type, filepath) {

    const source = loadShaderSource(filepath);

    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
};


export function makeProgram(gl, vertex_shader_filepath, fragment_shader_filepath) {
    const program = gl.createProgram();

    const vertex_shader = makeShader(gl, gl.VERTEX_SHADER, vertex_shader_filepath);
    const fragment_shader = makeShader(gl, gl.FRAGMENT_SHADER, fragment_shader_filepath);

    gl.attachShader(program, vertex_shader);
    gl.attachShader(program, fragment_shader);
    gl.linkProgram(program);

    gl.deleteShader(vertex_shader);
    gl.deleteShader(fragment_shader);

    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
};


