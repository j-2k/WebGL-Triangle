import { CreateMaterial } from "./render-utils";

//import default_vertex_shader from "./shaders-glsl/defaultshader/vertexshader.glsl?raw";
//import default_fragment_shader from "./shaders-glsl/defaultshader/fragmentshader.glsl?raw";

import UVtest_Vshader from "./shaders-glsl/UVtestshader/vertexshader.glsl?raw";
import UVtest_Fshader from "./shaders-glsl/UVtestshader/fragmentshader.glsl?raw";

import textureShader_V from "./shaders-glsl/textureshader/vertexshader.glsl?raw";
import textureShader_F from "./shaders-glsl/textureshader/fragmentshader.glsl?raw";

import { DrawF3DCW, DrawF3DCCW, SetColorsOfF3D, SetTexcoords, SetTexcoordsCube, Draw3DCube } from "./shapes";
import MathUtils from "./custom-math-utils";
import { GameObjectTransforms } from "./engineobjects";

function InitializeRenderer(gl: WebGLRenderingContext): void {
    //Making a shaderprogram that webgl will use.
    const shaderProgram = CreateMaterial(gl, textureShader_V, textureShader_F);
    if (!shaderProgram) {
        console.error("Failed to create shader program inside the Renderer function...");
        return;
    }

    //Get references to the memory locations of letiables in the shader program
    //look up where the vertex data needs to go.
    const positionAttributeLocation = gl.getAttribLocation(shaderProgram, "a_position");
    const texcoordAttributeLocation = gl.getAttribLocation(shaderProgram,"a_texcoord")
    //const colorLocation = gl.getAttribLocation(shaderProgram, "a_color");
    
    //lookup uniforms
    //const resolutionUniformLocation = gl.getUniformLocation(shaderProgram, "u_resolution");
    //const colorUniformLocation = gl.getUniformLocation(shaderProgram, "u_color");
    const matrixLocation = gl.getUniformLocation(shaderProgram, "u_matrix");
    const textureLocation = gl.getUniformLocation(shaderProgram, "u_texture");

    // Create a buffer to put positions in
    const positionBuffer = gl.createBuffer();

    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    Draw3DCube(gl);

    // Create a buffer for colors.
    //const colorBuffer = gl.createBuffer();
    //gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    // Put the colors in the buffer.
    //SetColorsOfF3D(gl);


    /*
    const texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    var textureF = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureF);

    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array([0, 0, 255, 255]));

    const img = new Image();
    img.src = "/f-texture.png";
    img.addEventListener('load', function() {
        //Image has been loaded here, now bind it to the texture attribute
        gl.bindTexture(gl.TEXTURE_2D, textureF);
        gl.texImage2D(gl.TEXTURE_2D, 0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
        gl.generateMipmap(gl.TEXTURE_2D);
    })
    SetTexcoords(gl)
    */


    var texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

    SetTexcoordsCube(gl);

    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // fill texture with 3x2 pixels
    const level = 0;
    const internalFormat = gl.LUMINANCE;
    const width = 3;
    const height = 2;
    const border = 0;
    const format = gl.LUMINANCE;
    const type = gl.UNSIGNED_BYTE;
    const data = new Uint8Array([
    128,  64, 128,
        0, 192,   0,
    ]);
    const alignment = 1;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, alignment);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border,
                format, type, data);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    {// Nice to see WebGL do all the work, compared to the Software Rasterizer I did where this had to be done manually
        //Culling section
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.frontFace(gl.CCW);
        //Explanation of what is going in inside culling
        //Good explanation here > https://learnopengl.com/Advanced-OpenGL/Face-culling
        //The theory is that depending on the winding the triangle is made in CCW or CW, 
        //the normal that is created from that triangle will be put in a dot product with the camera's view direction (mathf.dot(normal, viewDirection)), 
        //if the dot product is negative, then that means the normal is facing away from the camera, and thus the triangle is not visible so it is culled else show!
        //Thinking of the theory helped me understand it a lot more!

        //Test the Depth Buffer
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        //Explanation of what is going in inside depth testing
        //Good Explanation here > https://learnopengl.com/Advanced-OpenGL/Depth-testing
        //Depth testing works by comparing the depth value of the fragment with the depth value in the depth buffer.
        //If the comparison is true based on the depth function chosen, for example LEQUAL, then update the color buffer & the depth buffer.
        //Look at the Z Buffer algorithim to see how this works, other algorithms such as Painters algorithim & Scan Line Rendering can help you understand why depth testing is necessary
    }

    let objectF: GameObjectTransforms = {
        translation: [0, 0, 0],
        rotation: [0, 0, Math.PI],
        scale: [1, 1, 1],
        color: [MathUtils.RandomFloat(0, 1), MathUtils.RandomFloat(0, 1), MathUtils.RandomFloat(0, 1), 1]
    }

    //Camera Setup
    let fieldOfViewRadians = 90 * Math.PI/180; //Fov takes degrees and converts to radians
    let aspect = gl.canvas.width / gl.canvas.height;
    let zNear = 1;
    let zFar = 2000;
    let cameraAngleRad = Math.PI*1.5;

    //F objects
    let numFs = 4;
    let radius = 200;

    //Delta Time Testing
    let fRotSpeed = 1.5;
    let after = 0;

    requestAnimationFrame(Renderer);

    Renderer();
    UpdateSliderValues(objectF);

    function Renderer(): void {
        //console.log("START OF UPDATE --- STARTING UPDATE LOOP!")
        const now = performance.now() * 0.001;
        //console.log("now time stamp: " + now);
        const deltaTime = now - after;
        //console.log("deltaTime: " + deltaTime);
        after = now;
        //webglUtils.resizeCanvasToDisplaySize(gl.canvas); for handling canvas size read more here > https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
        //Tell WebGL to convert from clip space (-1 to 1) to real pixel space (0 to canvas.width/height)
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        //Now clearing both color & depth buffer
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        //Tell WebGL to use the shader program with the final material we made above!
        gl.useProgram(shaderProgram);

        {   //Position Attribute Binding
            AttributeBinding(gl, positionAttributeLocation,positionBuffer,3,gl.FLOAT,false,0,0);
        }

        {   //Color Attribute Binding
            //AttributeBinding(gl,colorLocation,3,gl.UNSIGNED_BYTE,true,0,0)

            //Texture Attribute Binding
            AttributeBinding(gl,texcoordAttributeLocation,texcoordBuffer,2,gl.FLOAT,false,0,0);
        }



        {   //Assigning Attributes in the selected shader material
            //gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
            //gl.uniform4fv(colorUniformLocation, objectF.color);
        }

        {
            //Triangle order section
            //Check the culling section above to see how to cull the triangles, you can set the instructions to cull front or back faces and set the order of the triangles verts with gl.frontFace(gl.CCW);
            //RED IS THE FRONT FACE OF THE F WHILE THE PURPLE IS THE BACK
            //DrawF3DCCW(gl);         //CCW TRIANGLES CULLING BACKFACE! 
            //DrawF3DCW(gl);        //CW TRIANGLES CULLING FRONTFACE! Rotate the object it might be invisible!
        }


        let projectionMatrix = MathUtils.m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

        // Use matrix math to compute a position on a circle where
        // the camera is
        let cameraMatrix = MathUtils.m4.yRotation(cameraAngleRad);
        cameraMatrix = MathUtils.m4.translate(cameraMatrix, 0, 0, radius * 1.5);
        
        
        //Camera Look At Implementation
        //in a 4x4 matrix the camera position is in the 4th row on the bottom & its first 3 values from left to right, the index's are 12, 13, 14
        let cameraPos = [
            cameraMatrix[12],
            cameraMatrix[13], 
            cameraMatrix[14]
        ];
        
        const cameraPositionBackZ = [0,0,300];

        //Specify the up vector for our camera to do the cross product with!
        let upVector = [0, 1, 0];

        let targetPosition = [0,0,0];

        // Compute the camera's matrix using look at.
        cameraMatrix = MathUtils.m4.lookAt(cameraPositionBackZ, targetPosition, upVector);
        
        
        // Make a view matrix from the camera matrix.
        let viewMatrix = MathUtils.m4.inverse(cameraMatrix);
        let viewProjectionMatrix = MathUtils.m4.multiply(projectionMatrix, viewMatrix);

        for (let ii = 0; ii < numFs; ++ii) {
            const angle = ii * Math.PI * 1 / numFs;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
      
            //Compute a matrix for the F object (Read from bottom to top for correct order of operations)
            let matrixF = MathUtils.m4.translate(viewProjectionMatrix, x, 0, y);
            matrixF = MathUtils.m4.translate(matrixF, objectF.translation[0], objectF.translation[1] + ii*50 - 100, objectF.translation[2]);
            matrixF = MathUtils.m4.multiply(matrixF, MathUtils.m4.xRotation(objectF.rotation[0]));
            matrixF = MathUtils.m4.multiply(matrixF, MathUtils.m4.yRotation(objectF.rotation[1]));
            matrixF = MathUtils.m4.multiply(matrixF, MathUtils.m4.zRotation(objectF.rotation[2]));
            matrixF = MathUtils.m4.scale(matrixF, objectF.scale[0]*20, objectF.scale[1]*20, objectF.scale[2]*20);
            //matrixF = MathUtils.m4.translate(matrixF, -50, -75, 0); //centering offset

            //Pass the matrix to the shader program
            gl.uniformMatrix4fv(matrixLocation, false, matrixF);
            
            gl.uniform1i(textureLocation, 0);

            // Draw the geometry
            const primitiveType = gl.TRIANGLES;
            const offset = 0;
            const count = 6 * 6;
            gl.drawArrays(primitiveType, offset, count);
        }

        // Every frame increase the rotation.
        objectF.rotation[1] += fRotSpeed * deltaTime;
        //console.log("objectF.rotation[1]: " + objectF.rotation[1].toPrecision(1));
        //console.log("END OF UPDATE --- STARTING CALL BACK TO UPDATE LOOP!")
        requestAnimationFrame(Renderer);
    }

    function UpdateSliderValues(GameObjectTransform: GameObjectTransforms) {
            //Event listeners for the sliders
    const sliders = ['RangeFOV','RangeTX', 'RangeTY','RangeTZ', 'RangeRX','RangeRY','RangeRZ', 'RangeS', 'RangeC'];
    sliders.forEach(sliderId => {
        const slider = document.getElementById(sliderId) as HTMLInputElement;
        if (slider) {
            slider.addEventListener('input', () => {
                handleSliderChange(sliderId, parseFloat(slider.value),parseFloat(slider.max), GameObjectTransform);
            });
        }
    });

    function handleSliderChange(sliderId: string, value: number, maxSliderValue: number, GameObjectTransform: GameObjectTransforms) {
        const nValue = value / maxSliderValue;
        switch (sliderId) {
            case 'RangeFOV':
                fieldOfViewRadians = value * Math.PI/180;
                break;
            case 'RangeTX':
                // Handle X change
                GameObjectTransform.translation[0] = value;
                break;
            case 'RangeTY':
                // Handle translation change
                GameObjectTransform.translation[1] = value;
                break;
            case 'RangeTZ':
                // Handle translation change
                GameObjectTransform.translation[2] = value;
                break;
            case 'RangeRX':
                // Handle rotation change
                //rotation[0] = value * Math.PI / 50; // old Convert to radians
                GameObjectTransform.rotation[0] = nValue * (Math.PI*2); //Already in radians
                break;
            case 'RangeRY':
                // Handle rotation change
                //rotation[1] = value * Math.PI / 50; // old Convert to radians
                GameObjectTransform.rotation[1] = nValue * (Math.PI*2); //Already in radians
                break;
            case 'RangeRZ':
                // Handle rotation change
                //rotation[2] = value * Math.PI / 50; // old Convert to radians
                GameObjectTransform.rotation[2] = nValue * (Math.PI*2); //Already in radians
                break;
            case 'RangeS':
                // Handle scale change
                const maxScale = (nValue*2-1) * 2;
                GameObjectTransform.scale = [maxScale,maxScale,maxScale]; // Adjust scale factor as needed
                break;
            case 'RangeC':
                // Handle color change
                //const nPI = nValue * Math.PI;
                // triangle formation  //2pi/3 = 2.094   //4pi/3 = 4.188
                //GameObjectTransform.color = [Math.sin(nPI)*0.5+0.5, Math.sin(nPI+2.094)*0.5+0.5, Math.sin(nPI+4.188)*0.5+0.5, 1];
                
                //Handle Camera Angle
                cameraAngleRad = nValue * Math.PI*2 + Math.PI;
                break;
        }
        Renderer();
    }
}
}

function AttributeBinding(_gl : WebGLRenderingContext, attributeLocation : number, buffer : WebGLBuffer | null,
    _Size : number = 3, 
    _Type : number = _gl.FLOAT, 
    _Normalize : boolean = false, 
    _Stride : number = 0, 
    _Offset : number = 0
)
{
    // Turn on the vertex attribute & assign it its location
    _gl.enableVertexAttribArray(attributeLocation);

    //Bind the GL array buffer with the buffer created for the location above.
    _gl.bindBuffer(_gl.ARRAY_BUFFER, buffer);

    // Tell the attribute how to get data out of colorBuffer (ARRAY_BUFFER)
    const size = _Size;                     // 3 components per iteration
    const type = _Type;                     // the data is 8bit unsigned values
    const normalize = _Normalize;           // normalize the data (convert from 0-255 to 0-1)
    const stride = _Stride;                 // 0 = move forward size * sizeof(type) each iteration to get the next position
    const offset = _Offset;                 // start at the beginning of the buffer
    _gl.vertexAttribPointer(
    attributeLocation, size, type, normalize, stride, offset);
    
}

export {
    InitializeRenderer,
}
