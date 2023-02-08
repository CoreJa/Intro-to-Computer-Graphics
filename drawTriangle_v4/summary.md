I wrote my codes based on my last homework. Which required me to rotate the square. It is a great base for this homework.



By the way you review my homework via: https://cg.coreja.com



Here's what I mainly did: 

- Some basic but common work:
  - Removing `requestAnimationFrame` function called as we are using user input for drawing.
  - Combining all the `VBO` into one. (It is more efficient comparing to use **TWO** separate `VBO`).
  - Writing functions for each HTML that read from input slider.
  - extract method `draw` from previous codes so I can draw with different parameters.
- Work that are more specific:
  - Modifying GLSL for each HTML page to correctly render
    - rotation remains the same
    - multiplying when scaling
    - adding when translate
  - modifying `draw` to let `uniform` get the correct data in GPU

