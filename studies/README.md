# Demonstration studies

Seven short monochrome pieces, included as readable code. They were written for this showcase **outside HoloGenesis**. The real Studio preview then ran them to produce the screenshots in the main README. They are not native HoloGenesis generations, and they are labelled as such inside the Studio and in each file's first line. The table below is written for readers of the code; the main README shows three of the studies, each with a short plain description.

| File | Runtime | Mathematics |
| --- | --- | --- |
| `mono-recursive-cathedral.frag` | GLSL ES 1.0 fragment shader (`u_resolution`, `u_time`) | A Menger-sponge lattice seen from inside, raymarched with distance estimation. Detail fades out below pixel size; ambient occlusion, soft shadows and fog give depth. The camera wraps on the lattice period, so the glide never ends |
| `mono-hyperbolic-band.frag` | GLSL ES 1.0 fragment shader | The {7,3} tiling of the hyperbolic plane, folded by the (2,3,7) reflection group and shown in the band model. The drift wraps on the tiling's exact translation period |
| `mono-chladni-cymatics.frag` | GLSL ES 1.0 fragment shader | Chladni plate modes *u = cos(nπx/a)·cos(mπy/b) − cos(mπx/a)·cos(nπy/b)*. Sand gathers on the still (nodal) lines, found with the analytic gradient; symmetric mode pairs cross-fade on a 60-second cycle |
| `mono-mandelbrot-zoom.frag` | GLSL ES 1.0 fragment shader | A seamless logarithmic zoom loop into a spiral region of the Mandelbrot set; two cross-faded layers hide the loop seam |
| `mono-attractor-light.three.js` | Three.js script (globals `THREE`, `width`, `height`) | One Lorenz trajectory (σ = 10, ρ = 28, β = 8/3, integrated with RK4) of 600,000 points. It is shown as one large butterfly and a constellation of smaller instances, as additive points with speed-based brightness and travelling pulses |
| `mono-reaction-diffusion.three.js` | Three.js script (globals `THREE`, `width`, `height`) | Gray–Scott reaction–diffusion with an isotropic 9-point Laplacian on ping-pong render targets. 100 soft seeds sit on a low-discrepancy sequence; feed and kill rates vary across the frame, from spots to worms to labyrinths |
| `mono-flow-field.p5.js` | p5.js sketch for the Studio's p5-compatible runtime | Particles advected by curl noise derived from a gradient-noise stream function. Low-alpha silver segments accumulate on a canvas that is never cleared |

The shader studies run in any WebGL 1 host that supplies `u_resolution` (pixels) and `u_time` (seconds). The Three.js studies expect the Studio preview's sandbox globals. The p5.js study uses only `setup()`, `draw()` and the core drawing functions of the Studio's p5-compatible runtime.
