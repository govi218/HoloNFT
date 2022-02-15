controller:
  * keeps track of how many faces
  * picks one
  * calls onUpdate with the most recent location of a face and a hasFace T/F flag

  interpolates position and scale of the face, to smooth out movement of the 3D object from one to the other

  doProcess() iterates over animation frames from `window.requestAnimationFrame` 