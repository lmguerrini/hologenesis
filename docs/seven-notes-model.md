# Seven Notes on a Drumhead: the model

*Seven Notes on a Drumhead* shows the figures that fine sand would draw on a circular drumhead driven by a pure sine
wave, note by note. Nothing in it is drawn by hand. Every line on the drumhead comes from the physics described below,
recomputed for every pixel of every frame.

## The drumhead

The model is an ideal membrane.

| Quantity | Value |
| --- | --- |
| Radius *a* | 0.30 m |
| Tension *T* | 1858.49 N/m |
| Areal density σ | 0.25 kg/m² |
| Wave speed *c* = √(*T*/σ) | 86.22 m/s |
| Rim | Fixed: the membrane cannot move at *r* = *a* |
| Damping | Modal damping ratio ζ = 0.01 |
| Drive | A sinusoidal point force at 0.417 *a* from the centre, on the horizontal axis, to the right |

The tension was chosen so that the lowest mode vibrates at exactly 110 Hz (the note A2).

## Modes

The membrane vibrates as a sum of modes *φ*<sub>mn</sub>(*r*, θ) = *J*<sub>m</sub>(α<sub>mn</sub> *r*/*a*) cos(*m*θ):

- *J*<sub>m</sub> is the Bessel function of order *m*.
- α<sub>mn</sub> is its *n*-th zero, so every mode vanishes on the rim.
- *m* counts the nodal diameters and *n* counts the nodal circles, the rim included.

Each mode has a natural frequency *f*<sub>mn</sub> = α<sub>mn</sub> *c* / (2π*a*) = 110 Hz × α<sub>mn</sub> / 2.4048.

The drive sits on the axis θ = 0. That makes every figure an exact mirror image about the horizontal axis, and it leaves
the sin(*m*θ) twin of each mode at rest.

## The steady response

At drive frequency *f*, each mode settles at the complex amplitude

*A*<sub>mn</sub>(*f*) = *J*<sub>m</sub>(α<sub>mn</sub> *r*<sub>0</sub>/*a*) / (*K*<sub>mn</sub> (*f*<sub>mn</sub>² − *f*² +
2*i* ζ *f*<sub>mn</sub> *f*))

- The numerator is the mode's height at the drive point, *r*<sub>0</sub> = 0.417 *a*.
- *K*<sub>mn</sub> is the mode's mean square over the disk: *J*<sub>m+1</sub>(α<sub>mn</sub>)² for *m* = 0, and half
  that for *m* ≥ 1.
- The displacement is *u* = Σ *A*<sub>mn</sub> *φ*<sub>mn</sub>, summed over every mode up to 1.3 *f*.

## From vibration to light

Sand bounces off the parts of a drumhead that move and comes to rest where it stays still. The piece therefore lights
up the places where |*u*| is small.

The brightness is *I* = exp(−(*v*/0.10)²), where *v* = |*u*| / (2.6 *R*):

- *R* is the root-mean-square displacement over the whole disk. Because the modes are orthogonal, it comes straight
  from the amplitudes: *R*² = Σ |*A*<sub>mn</sub>|² *K*<sub>mn</sub>.
- A wider, fainter profile of the same quantity adds a soft glow.
- The fixed rim is itself a still circle, so it is drawn as a faint ring.

## The seven notes

The notes use equal temperament with A4 = 440 Hz. Each one lies within 14 cents of a resonance of the drumhead, so a
single mode dominates and draws a clear figure. The shares in the last column were computed by the reference
implementation described below. The rest of the vibration, spread over the other modes, bends that
figure into the shapes on screen.

| Note | Frequency | Dominant resonance (*m*, *n*) | Its frequency | Offset | Share of the vibration |
| --- | --- | --- | --- | --- | --- |
| D4 | 293.66 Hz | (3, 1) | 291.84 Hz | +10.8 cents | 94.7 % |
| F4 | 349.23 Hz | (4, 1) | 347.10 Hz | +10.6 cents | 78.5 % |
| E5 | 659.26 Hz | (4, 3) | 657.42 Hz | +4.8 cents | 84.8 % |
| G5 | 783.99 Hz | (6, 3) | 777.78 Hz | +13.8 cents | 81.3 % |
| A♯5 | 932.33 Hz | (6, 4) | 929.50 Hz | +5.3 cents | 67.2 % |
| B5 | 987.77 Hz | (7, 4) | 989.91 Hz | −3.8 cents | 78.7 % |
| C6 | 1046.50 Hz | (8, 4) | 1049.54 Hz | −5.0 cents | 67.9 % |

For G5 the dominant mode is not the nearest one. The resonance (9, 2), at 788.64 Hz and −10.2 cents, lies closer,
but the drive point sits where that mode barely moves: its coupling there is about a fifth of the (6, 3) mode's.

## Time

- Each note lasts 6.5 seconds: it is held for 5 seconds, then crossfades into the next one over 1.5 seconds. After C6
  the cycle returns to D4, so a full cycle takes 45.5 seconds.
- During a crossfade both notes drive the membrane at once, with equal-power weights. For two different frequencies the
  mean-square vibrations simply add, so one figure dissolves into the next.
- The frequency is never swept. A sweep would make the image flicker through every resonance in between.

## The rulers

When the frame is wide enough, two identical rulers frame the drumhead:

- The scale is logarithmic, from 100 Hz at the bottom to 1,200 Hz at the top.
- A tick marks each of the membrane's natural frequencies in that range: 83 of them, as counted by the reference
  implementation. Lower modes have brighter ticks.
- A glowing marker shows the note being played. During a crossfade, the outgoing marker fades as the incoming one
  brightens.

## How the shader computes it

- **Bessel functions:** Miller's downward recurrence, normalised by the identity 1 = *J*<sub>0</sub> + 2(*J*<sub>2</sub> +
  *J*<sub>4</sub> + …).
- **Zeros α<sub>mn</sub>:** an asymptotic first estimate, refined by Newton's method. The estimate is Olver's
  large-order formula for the first zeros of high orders and McMahon's expansion otherwise.
- **Precision:** 32-bit floating point throughout. The shader declares `precision highp float`.

## How it was checked

An independent reference implementation in NumPy computes the modal sum over the 122 modes up to 1.5 kHz with at
most 20 nodal diameters, with Bessel zeros checked against published tables. It renders each note, and the shader's frames are compared with it:

- The still lines are extracted from both images, and their overlap is measured as intersection over union.
- At the middle of each held note, the shader's figure overlaps the reference for that note by 0.78 to 0.91. Its overlap
  with the reference for any other note stays at or below 0.44.
- Every frame is an exact mirror image about the horizontal axis, as the physics requires.
- The figures are unchanged after half an hour of running.

## Limits

- **An ideal membrane.** It has no bending stiffness and no air loading, and its tension is perfectly uniform. Real drums
  depart from all three. Chladni's classic figures come from stiff plates, which obey a different equation.
- **The sand is not simulated.** The brightness shows where the membrane stays still, which is where real sand would
  settle.
- **The shader truncates the sum.** It keeps the modes up to 1.3 times the drive frequency. The higher modes change the
  figures very little.
