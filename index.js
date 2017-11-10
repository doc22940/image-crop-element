class ImageCropElement extends HTMLElement {
  constructor() {
    super()
    this.startX = null
    this.startY = null
    this.minWidth = 10
    this.attachShadow({mode: 'open'})
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        :host(.nesw), .nesw { cursor: nesw-resize; }
        :host(.nwse), .nwse { cursor: nwse-resize; }
        :host(.nesw) .crop-box,
        :host(.nwse) .crop-box {
          cursor: inherit;
        }
        .crop-wrapper {
          position: relative;
          font-size: 0;
        }
        .crop-container {
          user-select: none;
          position: absolute;
          overflow: hidden;
          z-index: 1;
          top: 0;
          width: 100%;
          height: 100%;
        }
        .crop-box {
          position: absolute;
          border: 1px dashed #fff;
          box-shadow: 0 0 10000px 10000px rgba(0, 0, 0, .3);
          box-sizing: border-box;
          cursor: move;
        }
        .handle { position: absolute; }
        .handle:before {
          position: absolute;
          display: block;
          padding: 4px;
          transform: translate(-50%, -50%);
          content: ' ';
          background: #fff;
          border: 1px solid #767676;
        }
        .ne { top: 0; right: 0; }
        .nw { top: 0; left: 0; }
        .se { bottom: 0; right: 0; }
        .sw { bottom: 0; left: 0; }
      </style>
      <div class="crop-wrapper">
        <img src="${this.getAttribute('src')}" width="100%">
        <div class="crop-container">
          <div class="crop-box">
            <div class="handle nw nwse"></div>
            <div class="handle ne nesw"></div>
            <div class="handle sw nesw"></div>
            <div class="handle se nwse"></div>
          </div>
        </div>
      </div>
      <slot></slot>
    `
    this.image = this.shadowRoot.querySelector('img')
    this.box = this.shadowRoot.querySelector('.crop-box')

    this.image.addEventListener('load', this.imageReady.bind(this))
    this.addEventListener('mouseleave', this.stopUpdate)
    this.addEventListener('mouseup', this.stopUpdate)
    // This is on shadow root so we can tell apart the event target
    this.shadowRoot.addEventListener('mousedown', this.startUpdate.bind(this))
  }

  imageReady(event) {
    const image = event.target
    const side = Math.round(image.width > image.height ? image.height : image.width)
    this.startX = (image.width - side) / 2
    this.startY = (image.height - side) / 2
    this.updateDimensions(side, side)
    this.dispatchEvent(new CustomEvent('crop:init', {bubbles: true}))
  }

  stopUpdate() {
    this.classList.remove('nwse', 'nesw')
    this.removeEventListener('mousemove', this.updateCropArea)
    this.removeEventListener('mousemove', this.moveCropArea)
  }

  startUpdate(event) {
    if (event.target === this.box) {
      // Move crop area
      this.addEventListener('mousemove', this.moveCropArea)
    } else {
      // Change crop area
      const classList = event.target.classList
      this.addEventListener('mousemove', this.updateCropArea)

      if (classList.contains('handle')) {
        if (classList.contains('nwse')) this.classList.add('nwse')
        if (classList.contains('nesw')) this.classList.add('nesw')
        this.startX =
          this.box.offsetLeft + (classList.contains('se') || classList.contains('ne') ? 0 : this.box.offsetWidth)
        this.startY =
          this.box.offsetTop + (classList.contains('se') || classList.contains('sw') ? 0 : this.box.offsetHeight)
        this.updateCropArea(event)
      } else {
        const rect = this.getBoundingClientRect()
        this.startX = event.pageX - rect.x - window.scrollX
        this.startY = event.pageY - rect.y - window.scrollY
      }
    }
  }

  updateDimensions(deltaX, deltaY) {
    let newSide = Math.max(Math.abs(deltaX), Math.abs(deltaY), this.minWidth)
    newSide = Math.min(
      newSide,
      deltaY > 0 ? this.image.height - this.startY : this.startY,
      deltaX > 0 ? this.image.width - this.startX : this.startX
    )

    const x = Math.round(Math.max(0, deltaX > 0 ? this.startX : this.startX - newSide))
    const y = Math.round(Math.max(0, deltaY > 0 ? this.startY : this.startY - newSide))

    this.box.style.left = `${x}px`
    this.box.style.top = `${y}px`
    this.box.style.width = `${newSide}px`
    this.box.style.height = `${newSide}px`
    this.fireChangeEvent({x, y, width: newSide, height: newSide})
  }

  moveCropArea(event) {
    const x = Math.min(Math.max(0, this.box.offsetLeft + event.movementX), this.image.width - this.box.offsetWidth)
    const y = Math.min(Math.max(0, this.box.offsetTop + event.movementY), this.image.height - this.box.offsetHeight)
    this.box.style.left = `${x}px`
    this.box.style.top = `${y}px`

    this.fireChangeEvent({x, y, width: this.box.offsetWidth, height: this.box.offsetHeight})
  }

  updateCropArea(event) {
    const rect = this.getBoundingClientRect()
    const deltaX = event.pageX - this.startX - rect.x - window.scrollX
    const deltaY = event.pageY - this.startY - rect.y - window.scrollY
    this.updateDimensions(deltaX, deltaY)
  }

  fireChangeEvent(result) {
    const ratio = this.image.naturalWidth / this.image.width
    for (const key in result) {
      result[key] = Math.round(result[key] * ratio)
    }

    this.dispatchEvent(new CustomEvent('crop:change', {bubbles: true, detail: result}))
  }
}

window.customElements.define('image-crop', ImageCropElement)
