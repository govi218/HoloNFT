/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
/*!***********************************!*\
  !*** ./src/face-target/aframe.js ***!
  \***********************************/
const {Controller, UI} = window.MINDAR.FACE;

const THREE = AFRAME.THREE;

AFRAME.registerSystem('mindar-face-system', {
  container: null,
  video: null,
  shouldFaceUser: true,
  lastHasFace: false,

  init: function() {
    this.anchorEntities = [];
    this.faceMeshEntities = [];
  },

  setup: function({uiLoading, uiScanning, uiError}) {
    this.ui = new UI({uiLoading, uiScanning, uiError});
  },

  registerFaceMesh: function(el) {
    this.faceMeshEntities.push({el});
  },

  registerAnchor: function(el, anchorIndex) {
    this.anchorEntities.push({el: el, anchorIndex});
  },

  start: function() {
    this.ui.showLoading();

    this.container = this.el.sceneEl.parentNode;
    //this.__startVideo();
    this._startVideo();
  },

  stop: function() {
    this.pause();
    const tracks = this.video.srcObject.getTracks();
    tracks.forEach(function(track) {
      track.stop();
    });
    this.video.remove();
  },

  switchCamera: function() {
    this.shouldFaceUser = !this.shouldFaceUser;
    this.stop();
    this.start();
  },

  pause: function(keepVideo=false) {
    if (!keepVideo) {
      this.video.pause();
    }
    this.controller.stopProcessVideo();
  },

  unpause: function() {
    this.video.play();
    this.controller.processVideo(this.video);
  },

  // mock a video with an image
  __startVideo: function() {
    this.video = document.createElement("img");
    this.video.onload = async () => {
      this.video.videoWidth = this.video.width;
      this.video.videoHeight = this.video.height;

      await this._setupAR();
      this._processVideo();
      this.ui.hideLoading();
    }
    this.video.style.position = 'absolute'
    this.video.style.top = '0px'
    this.video.style.left = '0px'
    this.video.style.zIndex = '-2'
    this.video.src = "./assets/face1.jpeg";

    this.container.appendChild(this.video);
  },

  _startVideo: function() {
    this.video = document.createElement('video');

    this.video.setAttribute('autoplay', '');
    this.video.setAttribute('muted', '');
    this.video.setAttribute('playsinline', '');
    this.video.style.position = 'absolute'
    this.video.style.top = '0px'
    this.video.style.left = '0px'
    this.video.style.zIndex = '-2'
    this.container.appendChild(this.video);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.el.emit("arError", {error: 'VIDEO_FAIL'});
      this.ui.showCompatibility();
      return;
    }

    navigator.mediaDevices.getUserMedia({audio: false, video: {
      facingMode: (this.shouldFaceUser? 'face': 'environment'),
    }}).then((stream) => {
      this.video.addEventListener( 'loadedmetadata', async () => {
        this.video.setAttribute('width', this.video.videoWidth);
        this.video.setAttribute('height', this.video.videoHeight);
        await this._setupAR();
	this._processVideo();
	this.ui.hideLoading();
      });
      this.video.srcObject = stream;
    }).catch((err) => {
      console.log("getUserMedia error", err);
      this.el.emit("arError", {error: 'VIDEO_FAIL'});
    });
  },

  _processVideo: function() {
    this.controller.onUpdate = ({hasFace, estimateResult}) => {

      if (hasFace && !this.lastHasFace) {
	this.el.emit("targetFound");
      }
      if (!hasFace && this.lastHasFace) {
	this.el.emit("targetLost");
      }
      this.lastHasFace = hasFace;

      if (hasFace) {
	const {faceMatrix} = estimateResult;
	for (let i = 0; i < this.anchorEntities.length; i++) {
	  const landmarkMatrix = this.controller.getLandmarkMatrix(this.anchorEntities[i].anchorIndex);
	  this.anchorEntities[i].el.updateVisibility(true);
	  this.anchorEntities[i].el.updateMatrix(landmarkMatrix);
	}

	for (let i = 0; i < this.faceMeshEntities.length; i++) {
	  this.faceMeshEntities[i].el.updateVisibility(true);
	  this.faceMeshEntities[i].el.updateMatrix(faceMatrix);
	}
      } else {
	for (let i = 0; i < this.anchorEntities.length; i++) {
	  this.anchorEntities[i].el.updateVisibility(false);
	}
	for (let i = 0; i < this.faceMeshEntities.length; i++) {
	  this.faceMeshEntities[i].el.updateVisibility(false);
	}
      }
    }
    this.controller.processVideo(this.video);
  },

  _setupAR: async function() {
    this.controller = new Controller({});
    this._resize();

    await this.controller.setup(this.video);
    await this.controller.dummyRun(this.video);
    const {fov, aspect, near, far} = this.controller.getCameraParams();

    const camera = new THREE.PerspectiveCamera();
    camera.fov = fov;
    camera.aspect = aspect;
    camera.near = near;
    camera.far = far;
    camera.updateProjectionMatrix();

    const cameraEle = this.container.getElementsByTagName("a-camera")[0];
    cameraEle.setObject3D('camera', camera);
    cameraEle.setAttribute('camera', 'active', true);

    for (let i = 0; i < this.faceMeshEntities.length; i++) {
      this.faceMeshEntities[i].el.addFaceMesh(this.controller.createThreeFaceGeometry(THREE));
    }

    this._resize();
    window.addEventListener('resize', this._resize.bind(this));
    this.el.emit("arReady");
  },

  _resize: function() {
    const video = this.video;
    const container = this.container;
    let vw, vh; // display css width, height
    const videoRatio = video.videoWidth / video.videoHeight;
    const containerRatio = container.clientWidth / container.clientHeight;
    if (videoRatio > containerRatio) {
      vh = container.clientHeight;
      vw = vh * videoRatio;
    } else {
      vw = container.clientWidth;
      vh = vw / videoRatio;
    }
    this.video.style.top = (-(vh - container.clientHeight) / 2) + "px";
    this.video.style.left = (-(vw - container.clientWidth) / 2) + "px";
    this.video.style.width = vw + "px";
    this.video.style.height = vh + "px";

    const sceneEl = container.getElementsByTagName("a-scene")[0];
    sceneEl.style.top = this.video.style.top;
    sceneEl.style.left = this.video.style.left;
    sceneEl.style.width = this.video.style.width;
    sceneEl.style.height = this.video.style.height;
  }
});

AFRAME.registerComponent('mindar-face', {
  dependencies: ['mindar-face-system'],

  schema: {
    autoStart: {type: 'boolean', default: true},
    faceOccluder: {type: 'boolean', default: true},
    uiLoading: {type: 'string', default: 'yes'},
    uiScanning: {type: 'string', default: 'yes'},
    uiError: {type: 'string', default: 'yes'},
  },

  init: function() {
    const arSystem = this.el.sceneEl.systems['mindar-face-system'];

    if (this.data.faceOccluder) {
      const faceOccluderMeshEntity = document.createElement('a-entity');
      faceOccluderMeshEntity.setAttribute("mindar-face-default-face-occluder", true);
      this.el.sceneEl.appendChild(faceOccluderMeshEntity);
    }

    arSystem.setup({
      uiLoading: this.data.uiLoading,
      uiScanning: this.data.uiScanning,
      uiError: this.data.uiError,
    });

    if (this.data.autoStart) {
      this.el.sceneEl.addEventListener('renderstart', () => {
        arSystem.start();
      });
    }
  },
});

AFRAME.registerComponent('mindar-face-target', {
  dependencies: ['mindar-face-system'],

  schema: {
    anchorIndex: {type: 'number'},
  },

  init: function() {
    const arSystem = this.el.sceneEl.systems['mindar-face-system'];
    arSystem.registerAnchor(this, this.data.anchorIndex);

    const root = this.el.object3D;
    root.visible = false;
    root.matrixAutoUpdate = false;
  },

  updateVisibility(visible) {
    this.el.object3D.visible = visible;
  },

  updateMatrix(matrix) {
    const root = this.el.object3D;
    root.matrix.set(...matrix);
  }
});

AFRAME.registerComponent('mindar-face-occluder', {
  init: function() {
    const root = this.el.object3D;
    this.el.addEventListener('model-loaded', () => {
      this.el.getObject3D('mesh').traverse((o) => {
	if (o.isMesh) {
	  const material = new THREE.MeshStandardMaterial({
	    colorWrite: false,
	  });
	  o.material = material;
	}
      });
    });
  },
});

AFRAME.registerComponent('mindar-face-default-face-occluder', {
  init: function() {
    const arSystem = this.el.sceneEl.systems['mindar-face-system'];
    arSystem.registerFaceMesh(this);

    const root = this.el.object3D;
    root.matrixAutoUpdate = false;
  },

  updateVisibility(visible) {
    this.el.object3D.visible = visible;
  },

  updateMatrix(matrix) {
    const root = this.el.object3D;
    root.matrix.set(...matrix);
  },

  addFaceMesh(faceGeometry) {
    const material = new THREE.MeshBasicMaterial({colorWrite: false});
    //const material = new THREE.MeshBasicMaterial({colorWrite: '#CCCCCC'});
    const mesh = new THREE.Mesh(faceGeometry, material);
    this.el.setObject3D('mesh', mesh);
  },
});

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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O0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0Esa0RBQWtELGtCQUFrQjtBQUNwRSxvREFBb0Qsc0JBQXNCO0FBQzFFO0FBQ0E7QUFDQSxHQUFHO0FBQ0gsQ0FBQyIsInNvdXJjZXMiOlsid2VicGFjazovL21pbmQtYXIvLi9zcmMvZmFjZS10YXJnZXQvYWZyYW1lLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImNvbnN0IHtDb250cm9sbGVyLCBVSX0gPSB3aW5kb3cuTUlOREFSLkZBQ0U7XG5cbmNvbnN0IFRIUkVFID0gQUZSQU1FLlRIUkVFO1xuXG5BRlJBTUUucmVnaXN0ZXJTeXN0ZW0oJ21pbmRhci1mYWNlLXN5c3RlbScsIHtcbiAgY29udGFpbmVyOiBudWxsLFxuICB2aWRlbzogbnVsbCxcbiAgc2hvdWxkRmFjZVVzZXI6IHRydWUsXG4gIGxhc3RIYXNGYWNlOiBmYWxzZSxcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmFuY2hvckVudGl0aWVzID0gW107XG4gICAgdGhpcy5mYWNlTWVzaEVudGl0aWVzID0gW107XG4gIH0sXG5cbiAgc2V0dXA6IGZ1bmN0aW9uKHt1aUxvYWRpbmcsIHVpU2Nhbm5pbmcsIHVpRXJyb3J9KSB7XG4gICAgdGhpcy51aSA9IG5ldyBVSSh7dWlMb2FkaW5nLCB1aVNjYW5uaW5nLCB1aUVycm9yfSk7XG4gIH0sXG5cbiAgcmVnaXN0ZXJGYWNlTWVzaDogZnVuY3Rpb24oZWwpIHtcbiAgICB0aGlzLmZhY2VNZXNoRW50aXRpZXMucHVzaCh7ZWx9KTtcbiAgfSxcblxuICByZWdpc3RlckFuY2hvcjogZnVuY3Rpb24oZWwsIGFuY2hvckluZGV4KSB7XG4gICAgdGhpcy5hbmNob3JFbnRpdGllcy5wdXNoKHtlbDogZWwsIGFuY2hvckluZGV4fSk7XG4gIH0sXG5cbiAgc3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudWkuc2hvd0xvYWRpbmcoKTtcblxuICAgIHRoaXMuY29udGFpbmVyID0gdGhpcy5lbC5zY2VuZUVsLnBhcmVudE5vZGU7XG4gICAgLy90aGlzLl9fc3RhcnRWaWRlbygpO1xuICAgIHRoaXMuX3N0YXJ0VmlkZW8oKTtcbiAgfSxcblxuICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnBhdXNlKCk7XG4gICAgY29uc3QgdHJhY2tzID0gdGhpcy52aWRlby5zcmNPYmplY3QuZ2V0VHJhY2tzKCk7XG4gICAgdHJhY2tzLmZvckVhY2goZnVuY3Rpb24odHJhY2spIHtcbiAgICAgIHRyYWNrLnN0b3AoKTtcbiAgICB9KTtcbiAgICB0aGlzLnZpZGVvLnJlbW92ZSgpO1xuICB9LFxuXG4gIHN3aXRjaENhbWVyYTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zaG91bGRGYWNlVXNlciA9ICF0aGlzLnNob3VsZEZhY2VVc2VyO1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuc3RhcnQoKTtcbiAgfSxcblxuICBwYXVzZTogZnVuY3Rpb24oa2VlcFZpZGVvPWZhbHNlKSB7XG4gICAgaWYgKCFrZWVwVmlkZW8pIHtcbiAgICAgIHRoaXMudmlkZW8ucGF1c2UoKTtcbiAgICB9XG4gICAgdGhpcy5jb250cm9sbGVyLnN0b3BQcm9jZXNzVmlkZW8oKTtcbiAgfSxcblxuICB1bnBhdXNlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnZpZGVvLnBsYXkoKTtcbiAgICB0aGlzLmNvbnRyb2xsZXIucHJvY2Vzc1ZpZGVvKHRoaXMudmlkZW8pO1xuICB9LFxuXG4gIC8vIG1vY2sgYSB2aWRlbyB3aXRoIGFuIGltYWdlXG4gIF9fc3RhcnRWaWRlbzogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy52aWRlbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XG4gICAgdGhpcy52aWRlby5vbmxvYWQgPSBhc3luYyAoKSA9PiB7XG4gICAgICB0aGlzLnZpZGVvLnZpZGVvV2lkdGggPSB0aGlzLnZpZGVvLndpZHRoO1xuICAgICAgdGhpcy52aWRlby52aWRlb0hlaWdodCA9IHRoaXMudmlkZW8uaGVpZ2h0O1xuXG4gICAgICBhd2FpdCB0aGlzLl9zZXR1cEFSKCk7XG4gICAgICB0aGlzLl9wcm9jZXNzVmlkZW8oKTtcbiAgICAgIHRoaXMudWkuaGlkZUxvYWRpbmcoKTtcbiAgICB9XG4gICAgdGhpcy52aWRlby5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSdcbiAgICB0aGlzLnZpZGVvLnN0eWxlLnRvcCA9ICcwcHgnXG4gICAgdGhpcy52aWRlby5zdHlsZS5sZWZ0ID0gJzBweCdcbiAgICB0aGlzLnZpZGVvLnN0eWxlLnpJbmRleCA9ICctMidcbiAgICB0aGlzLnZpZGVvLnNyYyA9IFwiLi9hc3NldHMvZmFjZTEuanBlZ1wiO1xuXG4gICAgdGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy52aWRlbyk7XG4gIH0sXG5cbiAgX3N0YXJ0VmlkZW86IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudmlkZW8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd2aWRlbycpO1xuXG4gICAgdGhpcy52aWRlby5zZXRBdHRyaWJ1dGUoJ2F1dG9wbGF5JywgJycpO1xuICAgIHRoaXMudmlkZW8uc2V0QXR0cmlidXRlKCdtdXRlZCcsICcnKTtcbiAgICB0aGlzLnZpZGVvLnNldEF0dHJpYnV0ZSgncGxheXNpbmxpbmUnLCAnJyk7XG4gICAgdGhpcy52aWRlby5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSdcbiAgICB0aGlzLnZpZGVvLnN0eWxlLnRvcCA9ICcwcHgnXG4gICAgdGhpcy52aWRlby5zdHlsZS5sZWZ0ID0gJzBweCdcbiAgICB0aGlzLnZpZGVvLnN0eWxlLnpJbmRleCA9ICctMidcbiAgICB0aGlzLmNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLnZpZGVvKTtcblxuICAgIGlmICghbmF2aWdhdG9yLm1lZGlhRGV2aWNlcyB8fCAhbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEpIHtcbiAgICAgIHRoaXMuZWwuZW1pdChcImFyRXJyb3JcIiwge2Vycm9yOiAnVklERU9fRkFJTCd9KTtcbiAgICAgIHRoaXMudWkuc2hvd0NvbXBhdGliaWxpdHkoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSh7YXVkaW86IGZhbHNlLCB2aWRlbzoge1xuICAgICAgZmFjaW5nTW9kZTogKHRoaXMuc2hvdWxkRmFjZVVzZXI/ICdmYWNlJzogJ2Vudmlyb25tZW50JyksXG4gICAgfX0pLnRoZW4oKHN0cmVhbSkgPT4ge1xuICAgICAgdGhpcy52aWRlby5hZGRFdmVudExpc3RlbmVyKCAnbG9hZGVkbWV0YWRhdGEnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIHRoaXMudmlkZW8uc2V0QXR0cmlidXRlKCd3aWR0aCcsIHRoaXMudmlkZW8udmlkZW9XaWR0aCk7XG4gICAgICAgIHRoaXMudmlkZW8uc2V0QXR0cmlidXRlKCdoZWlnaHQnLCB0aGlzLnZpZGVvLnZpZGVvSGVpZ2h0KTtcbiAgICAgICAgYXdhaXQgdGhpcy5fc2V0dXBBUigpO1xuXHR0aGlzLl9wcm9jZXNzVmlkZW8oKTtcblx0dGhpcy51aS5oaWRlTG9hZGluZygpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnZpZGVvLnNyY09iamVjdCA9IHN0cmVhbTtcbiAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhcImdldFVzZXJNZWRpYSBlcnJvclwiLCBlcnIpO1xuICAgICAgdGhpcy5lbC5lbWl0KFwiYXJFcnJvclwiLCB7ZXJyb3I6ICdWSURFT19GQUlMJ30pO1xuICAgIH0pO1xuICB9LFxuXG4gIF9wcm9jZXNzVmlkZW86IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY29udHJvbGxlci5vblVwZGF0ZSA9ICh7aGFzRmFjZSwgZXN0aW1hdGVSZXN1bHR9KSA9PiB7XG5cbiAgICAgIGlmIChoYXNGYWNlICYmICF0aGlzLmxhc3RIYXNGYWNlKSB7XG5cdHRoaXMuZWwuZW1pdChcInRhcmdldEZvdW5kXCIpO1xuICAgICAgfVxuICAgICAgaWYgKCFoYXNGYWNlICYmIHRoaXMubGFzdEhhc0ZhY2UpIHtcblx0dGhpcy5lbC5lbWl0KFwidGFyZ2V0TG9zdFwiKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubGFzdEhhc0ZhY2UgPSBoYXNGYWNlO1xuXG4gICAgICBpZiAoaGFzRmFjZSkge1xuXHRjb25zdCB7ZmFjZU1hdHJpeH0gPSBlc3RpbWF0ZVJlc3VsdDtcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmFuY2hvckVudGl0aWVzLmxlbmd0aDsgaSsrKSB7XG5cdCAgY29uc3QgbGFuZG1hcmtNYXRyaXggPSB0aGlzLmNvbnRyb2xsZXIuZ2V0TGFuZG1hcmtNYXRyaXgodGhpcy5hbmNob3JFbnRpdGllc1tpXS5hbmNob3JJbmRleCk7XG5cdCAgdGhpcy5hbmNob3JFbnRpdGllc1tpXS5lbC51cGRhdGVWaXNpYmlsaXR5KHRydWUpO1xuXHQgIHRoaXMuYW5jaG9yRW50aXRpZXNbaV0uZWwudXBkYXRlTWF0cml4KGxhbmRtYXJrTWF0cml4KTtcblx0fVxuXG5cdGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5mYWNlTWVzaEVudGl0aWVzLmxlbmd0aDsgaSsrKSB7XG5cdCAgdGhpcy5mYWNlTWVzaEVudGl0aWVzW2ldLmVsLnVwZGF0ZVZpc2liaWxpdHkodHJ1ZSk7XG5cdCAgdGhpcy5mYWNlTWVzaEVudGl0aWVzW2ldLmVsLnVwZGF0ZU1hdHJpeChmYWNlTWF0cml4KTtcblx0fVxuICAgICAgfSBlbHNlIHtcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmFuY2hvckVudGl0aWVzLmxlbmd0aDsgaSsrKSB7XG5cdCAgdGhpcy5hbmNob3JFbnRpdGllc1tpXS5lbC51cGRhdGVWaXNpYmlsaXR5KGZhbHNlKTtcblx0fVxuXHRmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZmFjZU1lc2hFbnRpdGllcy5sZW5ndGg7IGkrKykge1xuXHQgIHRoaXMuZmFjZU1lc2hFbnRpdGllc1tpXS5lbC51cGRhdGVWaXNpYmlsaXR5KGZhbHNlKTtcblx0fVxuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmNvbnRyb2xsZXIucHJvY2Vzc1ZpZGVvKHRoaXMudmlkZW8pO1xuICB9LFxuXG4gIF9zZXR1cEFSOiBhc3luYyBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSBuZXcgQ29udHJvbGxlcih7fSk7XG4gICAgdGhpcy5fcmVzaXplKCk7XG5cbiAgICBhd2FpdCB0aGlzLmNvbnRyb2xsZXIuc2V0dXAodGhpcy52aWRlbyk7XG4gICAgYXdhaXQgdGhpcy5jb250cm9sbGVyLmR1bW15UnVuKHRoaXMudmlkZW8pO1xuICAgIGNvbnN0IHtmb3YsIGFzcGVjdCwgbmVhciwgZmFyfSA9IHRoaXMuY29udHJvbGxlci5nZXRDYW1lcmFQYXJhbXMoKTtcblxuICAgIGNvbnN0IGNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSgpO1xuICAgIGNhbWVyYS5mb3YgPSBmb3Y7XG4gICAgY2FtZXJhLmFzcGVjdCA9IGFzcGVjdDtcbiAgICBjYW1lcmEubmVhciA9IG5lYXI7XG4gICAgY2FtZXJhLmZhciA9IGZhcjtcbiAgICBjYW1lcmEudXBkYXRlUHJvamVjdGlvbk1hdHJpeCgpO1xuXG4gICAgY29uc3QgY2FtZXJhRWxlID0gdGhpcy5jb250YWluZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJhLWNhbWVyYVwiKVswXTtcbiAgICBjYW1lcmFFbGUuc2V0T2JqZWN0M0QoJ2NhbWVyYScsIGNhbWVyYSk7XG4gICAgY2FtZXJhRWxlLnNldEF0dHJpYnV0ZSgnY2FtZXJhJywgJ2FjdGl2ZScsIHRydWUpO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmZhY2VNZXNoRW50aXRpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuZmFjZU1lc2hFbnRpdGllc1tpXS5lbC5hZGRGYWNlTWVzaCh0aGlzLmNvbnRyb2xsZXIuY3JlYXRlVGhyZWVGYWNlR2VvbWV0cnkoVEhSRUUpKTtcbiAgICB9XG5cbiAgICB0aGlzLl9yZXNpemUoKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5fcmVzaXplLmJpbmQodGhpcykpO1xuICAgIHRoaXMuZWwuZW1pdChcImFyUmVhZHlcIik7XG4gIH0sXG5cbiAgX3Jlc2l6ZTogZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgdmlkZW8gPSB0aGlzLnZpZGVvO1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyO1xuICAgIGxldCB2dywgdmg7IC8vIGRpc3BsYXkgY3NzIHdpZHRoLCBoZWlnaHRcbiAgICBjb25zdCB2aWRlb1JhdGlvID0gdmlkZW8udmlkZW9XaWR0aCAvIHZpZGVvLnZpZGVvSGVpZ2h0O1xuICAgIGNvbnN0IGNvbnRhaW5lclJhdGlvID0gY29udGFpbmVyLmNsaWVudFdpZHRoIC8gY29udGFpbmVyLmNsaWVudEhlaWdodDtcbiAgICBpZiAodmlkZW9SYXRpbyA+IGNvbnRhaW5lclJhdGlvKSB7XG4gICAgICB2aCA9IGNvbnRhaW5lci5jbGllbnRIZWlnaHQ7XG4gICAgICB2dyA9IHZoICogdmlkZW9SYXRpbztcbiAgICB9IGVsc2Uge1xuICAgICAgdncgPSBjb250YWluZXIuY2xpZW50V2lkdGg7XG4gICAgICB2aCA9IHZ3IC8gdmlkZW9SYXRpbztcbiAgICB9XG4gICAgdGhpcy52aWRlby5zdHlsZS50b3AgPSAoLSh2aCAtIGNvbnRhaW5lci5jbGllbnRIZWlnaHQpIC8gMikgKyBcInB4XCI7XG4gICAgdGhpcy52aWRlby5zdHlsZS5sZWZ0ID0gKC0odncgLSBjb250YWluZXIuY2xpZW50V2lkdGgpIC8gMikgKyBcInB4XCI7XG4gICAgdGhpcy52aWRlby5zdHlsZS53aWR0aCA9IHZ3ICsgXCJweFwiO1xuICAgIHRoaXMudmlkZW8uc3R5bGUuaGVpZ2h0ID0gdmggKyBcInB4XCI7XG5cbiAgICBjb25zdCBzY2VuZUVsID0gY29udGFpbmVyLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYS1zY2VuZVwiKVswXTtcbiAgICBzY2VuZUVsLnN0eWxlLnRvcCA9IHRoaXMudmlkZW8uc3R5bGUudG9wO1xuICAgIHNjZW5lRWwuc3R5bGUubGVmdCA9IHRoaXMudmlkZW8uc3R5bGUubGVmdDtcbiAgICBzY2VuZUVsLnN0eWxlLndpZHRoID0gdGhpcy52aWRlby5zdHlsZS53aWR0aDtcbiAgICBzY2VuZUVsLnN0eWxlLmhlaWdodCA9IHRoaXMudmlkZW8uc3R5bGUuaGVpZ2h0O1xuICB9XG59KTtcblxuQUZSQU1FLnJlZ2lzdGVyQ29tcG9uZW50KCdtaW5kYXItZmFjZScsIHtcbiAgZGVwZW5kZW5jaWVzOiBbJ21pbmRhci1mYWNlLXN5c3RlbSddLFxuXG4gIHNjaGVtYToge1xuICAgIGF1dG9TdGFydDoge3R5cGU6ICdib29sZWFuJywgZGVmYXVsdDogdHJ1ZX0sXG4gICAgZmFjZU9jY2x1ZGVyOiB7dHlwZTogJ2Jvb2xlYW4nLCBkZWZhdWx0OiB0cnVlfSxcbiAgICB1aUxvYWRpbmc6IHt0eXBlOiAnc3RyaW5nJywgZGVmYXVsdDogJ3llcyd9LFxuICAgIHVpU2Nhbm5pbmc6IHt0eXBlOiAnc3RyaW5nJywgZGVmYXVsdDogJ3llcyd9LFxuICAgIHVpRXJyb3I6IHt0eXBlOiAnc3RyaW5nJywgZGVmYXVsdDogJ3llcyd9LFxuICB9LFxuXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGFyU3lzdGVtID0gdGhpcy5lbC5zY2VuZUVsLnN5c3RlbXNbJ21pbmRhci1mYWNlLXN5c3RlbSddO1xuXG4gICAgaWYgKHRoaXMuZGF0YS5mYWNlT2NjbHVkZXIpIHtcbiAgICAgIGNvbnN0IGZhY2VPY2NsdWRlck1lc2hFbnRpdHkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhLWVudGl0eScpO1xuICAgICAgZmFjZU9jY2x1ZGVyTWVzaEVudGl0eS5zZXRBdHRyaWJ1dGUoXCJtaW5kYXItZmFjZS1kZWZhdWx0LWZhY2Utb2NjbHVkZXJcIiwgdHJ1ZSk7XG4gICAgICB0aGlzLmVsLnNjZW5lRWwuYXBwZW5kQ2hpbGQoZmFjZU9jY2x1ZGVyTWVzaEVudGl0eSk7XG4gICAgfVxuXG4gICAgYXJTeXN0ZW0uc2V0dXAoe1xuICAgICAgdWlMb2FkaW5nOiB0aGlzLmRhdGEudWlMb2FkaW5nLFxuICAgICAgdWlTY2FubmluZzogdGhpcy5kYXRhLnVpU2Nhbm5pbmcsXG4gICAgICB1aUVycm9yOiB0aGlzLmRhdGEudWlFcnJvcixcbiAgICB9KTtcblxuICAgIGlmICh0aGlzLmRhdGEuYXV0b1N0YXJ0KSB7XG4gICAgICB0aGlzLmVsLnNjZW5lRWwuYWRkRXZlbnRMaXN0ZW5lcigncmVuZGVyc3RhcnQnLCAoKSA9PiB7XG4gICAgICAgIGFyU3lzdGVtLnN0YXJ0KCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG59KTtcblxuQUZSQU1FLnJlZ2lzdGVyQ29tcG9uZW50KCdtaW5kYXItZmFjZS10YXJnZXQnLCB7XG4gIGRlcGVuZGVuY2llczogWydtaW5kYXItZmFjZS1zeXN0ZW0nXSxcblxuICBzY2hlbWE6IHtcbiAgICBhbmNob3JJbmRleDoge3R5cGU6ICdudW1iZXInfSxcbiAgfSxcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICBjb25zdCBhclN5c3RlbSA9IHRoaXMuZWwuc2NlbmVFbC5zeXN0ZW1zWydtaW5kYXItZmFjZS1zeXN0ZW0nXTtcbiAgICBhclN5c3RlbS5yZWdpc3RlckFuY2hvcih0aGlzLCB0aGlzLmRhdGEuYW5jaG9ySW5kZXgpO1xuXG4gICAgY29uc3Qgcm9vdCA9IHRoaXMuZWwub2JqZWN0M0Q7XG4gICAgcm9vdC52aXNpYmxlID0gZmFsc2U7XG4gICAgcm9vdC5tYXRyaXhBdXRvVXBkYXRlID0gZmFsc2U7XG4gIH0sXG5cbiAgdXBkYXRlVmlzaWJpbGl0eSh2aXNpYmxlKSB7XG4gICAgdGhpcy5lbC5vYmplY3QzRC52aXNpYmxlID0gdmlzaWJsZTtcbiAgfSxcblxuICB1cGRhdGVNYXRyaXgobWF0cml4KSB7XG4gICAgY29uc3Qgcm9vdCA9IHRoaXMuZWwub2JqZWN0M0Q7XG4gICAgcm9vdC5tYXRyaXguc2V0KC4uLm1hdHJpeCk7XG4gIH1cbn0pO1xuXG5BRlJBTUUucmVnaXN0ZXJDb21wb25lbnQoJ21pbmRhci1mYWNlLW9jY2x1ZGVyJywge1xuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICBjb25zdCByb290ID0gdGhpcy5lbC5vYmplY3QzRDtcbiAgICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoJ21vZGVsLWxvYWRlZCcsICgpID0+IHtcbiAgICAgIHRoaXMuZWwuZ2V0T2JqZWN0M0QoJ21lc2gnKS50cmF2ZXJzZSgobykgPT4ge1xuXHRpZiAoby5pc01lc2gpIHtcblx0ICBjb25zdCBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoU3RhbmRhcmRNYXRlcmlhbCh7XG5cdCAgICBjb2xvcldyaXRlOiBmYWxzZSxcblx0ICB9KTtcblx0ICBvLm1hdGVyaWFsID0gbWF0ZXJpYWw7XG5cdH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxufSk7XG5cbkFGUkFNRS5yZWdpc3RlckNvbXBvbmVudCgnbWluZGFyLWZhY2UtZGVmYXVsdC1mYWNlLW9jY2x1ZGVyJywge1xuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICBjb25zdCBhclN5c3RlbSA9IHRoaXMuZWwuc2NlbmVFbC5zeXN0ZW1zWydtaW5kYXItZmFjZS1zeXN0ZW0nXTtcbiAgICBhclN5c3RlbS5yZWdpc3RlckZhY2VNZXNoKHRoaXMpO1xuXG4gICAgY29uc3Qgcm9vdCA9IHRoaXMuZWwub2JqZWN0M0Q7XG4gICAgcm9vdC5tYXRyaXhBdXRvVXBkYXRlID0gZmFsc2U7XG4gIH0sXG5cbiAgdXBkYXRlVmlzaWJpbGl0eSh2aXNpYmxlKSB7XG4gICAgdGhpcy5lbC5vYmplY3QzRC52aXNpYmxlID0gdmlzaWJsZTtcbiAgfSxcblxuICB1cGRhdGVNYXRyaXgobWF0cml4KSB7XG4gICAgY29uc3Qgcm9vdCA9IHRoaXMuZWwub2JqZWN0M0Q7XG4gICAgcm9vdC5tYXRyaXguc2V0KC4uLm1hdHJpeCk7XG4gIH0sXG5cbiAgYWRkRmFjZU1lc2goZmFjZUdlb21ldHJ5KSB7XG4gICAgY29uc3QgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe2NvbG9yV3JpdGU6IGZhbHNlfSk7XG4gICAgLy9jb25zdCBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7Y29sb3JXcml0ZTogJyNDQ0NDQ0MnfSk7XG4gICAgY29uc3QgbWVzaCA9IG5ldyBUSFJFRS5NZXNoKGZhY2VHZW9tZXRyeSwgbWF0ZXJpYWwpO1xuICAgIHRoaXMuZWwuc2V0T2JqZWN0M0QoJ21lc2gnLCBtZXNoKTtcbiAgfSxcbn0pO1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9