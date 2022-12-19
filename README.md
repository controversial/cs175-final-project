# Tufts CS175 Computer Graphics: Final Project
Written by Luke, Christian and Jacob.

## Live demo
[Link](https://cs175-final.vercel.app)

## Description
This project is a WebGL application that renders a scene with volumetric clouds, a realistic atmosphere, and interactive water in real-time. The project was an attempt to explore the techniques and compromises required to render realistic scenes in real-time.

## Development
1. Install a recent version of Node.js
2. Run `npm install` from the project root to install dependencies.
3. Run `npm run dev` to start the development server.
4. Open [`http://localhost:5173`](http://localhost:5173) in your browser.

## Usage
1. Use WASD to move around the scene.
2. Use IJKL to change your view angle.
3. Use Q and E to fly up and down
4. Click the surface of the water to create a ripple.
5. Scroll the page to change the sun’s position in the sky

## Credits
The wave equations for the water were (very loosely) based on an [implementation](https://github.com/amandaghassaei/gpu-io/blob/main/examples/wave2d/index.js) by Amanda Ghassaei.

The atmosphere raytracing is adapted from code published in [Precomputed Atmospheric Scattering: a New Implementation](https://ebruneton.github.io/precomputed_atmospheric_scattering/) by Eric Bruneton, which is based on an earlier paper, [Precomputed Atmospheric Scattering](https://hal.inria.fr/inria-00288758/document), by Eric Bruneton and Fabrice Neyret. We refactored the reference implementation to run as a reusble color function for an arbitrary world-space ray, but much of the core implementation remains unchanged.

Our approach to cloud raytracing is based on a [2015 SIGGRAPH presentation](https://www.guerrilla-games.com/media/News/Files/The-Real-time-Volumetric-Cloudscapes-of-Horizon-Zero-Dawn.pdf) by Guerrilla Games. We additionally referenced [this approach](https://blog.demofox.org/2020/05/10/ray-marching-fog-with-blue-noise/), which applies blue noise in order to disrupt the banding artifacts that are caused by course raymarching through the cloud volume. Finally, we credit the implementations of the noise functions we use in our clouds to Inigo Quilez and Dave Hoskins.

The birdbath model that appears in the scene is adapted from a [model](https://sketchfab.com/3d-models/bird-bath-da9098a83bec4768bf19b899577c9374) by Arthur Nicaise on Sketchfab.

The grass texture is from Minecraft.

Finally, we use two runtime JavaScript libraries in our code:

  1. [`gl-matrix`](https://www.npmjs.com/package/gl-matrix) for linear algebra and matrix operations.
  2. [`@gltf-transform/core`](https://www.npmjs.com/package/@gltf-transform/core) for parsing geometry and texture data from `.glb` files.
