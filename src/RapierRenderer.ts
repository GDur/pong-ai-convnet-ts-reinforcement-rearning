import * as RAPIER from '@dimforge/rapier2d-compat';
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { World } from '@dimforge/rapier2d-compat';

const BOX_INSTANCE_INDEX = 0;
const BALL_INSTANCE_INDEX = 1;

var kk = 0;

export class RapierRenderer {
  coll2gfx: Map<number, PIXI.Graphics>;
  colorIndex: number;
  colorPalette: Array<number>;
  renderer: PIXI.Renderer;
  scene: PIXI.Container;
  viewport: Viewport;
  instanceGroups = new Array<Array<PIXI.Graphics>>();
  lines = new PIXI.Graphics();

  constructor(pixiContianerSelector: string, public world: World) {
    PIXI.utils.skipHello();

    // High pixel Ratio make the rendering extremely slow, so we cap it.
    const pixelRatio = window.devicePixelRatio
      ? Math.min(window.devicePixelRatio, 1.5)
      : 1;

    this.coll2gfx = new Map();
    this.colorIndex = 0;
    this.colorPalette = [0xf3d9b9, 0x005a91, 0x05c5e0, 0x1f7a8c];
    this.renderer = new PIXI.Renderer({
      backgroundColor: 0x292929,
      antialias: true,
      resolution: pixelRatio,
      width: window.innerWidth,
      height: window.innerHeight,
    });

    this.scene = new PIXI.Container();
    let containerDiv = document.querySelector(
      pixiContianerSelector
    )! as HTMLElement;
    containerDiv.appendChild(this.renderer.view);

    this.viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: 1000,
      worldHeight: 1000,
      interaction: this.renderer.plugins.interaction,
    });

    this.scene.addChild(this.viewport);
    this.viewport.drag().pinch().wheel().decelerate();

    let me = this;

    function onWindowResize() {
      me.renderer.resize(window.innerWidth, window.innerHeight);
    }

    function onContextMenu(event: UIEvent) {
      event.preventDefault();
    }

    document.oncontextmenu = onContextMenu;
    document.body.oncontextmenu = onContextMenu;

    window.addEventListener('resize', onWindowResize, false);

    this.initInstances();

    this.startRenderLoop();
  }

  // 60 fps:
  startRenderLoop() {
    let self = this;
    let start: number;
    let previousTimeStamp = 0;

    function step(timestamp: number) {
      if (start === undefined) {
        start = timestamp;
      }
      const totalElapsedMs = timestamp - start;
      const dt = timestamp - previousTimeStamp;
      //console.log(totalElapsedMs, dt);

      // render the graphics
      self.render(self.world, true);

      previousTimeStamp = timestamp;
      window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  initInstances() {
    this.instanceGroups = [];
    this.instanceGroups.push(
      this.colorPalette.map((color) => {
        let graphics = new PIXI.Graphics();
        graphics.beginFill(color);
        graphics.drawRect(-1.0, 1.0, 2.0, -2.0);
        graphics.endFill();
        return graphics;
      })
    );

    this.instanceGroups.push(
      this.colorPalette.map((color) => {
        let graphics = new PIXI.Graphics();
        graphics.beginFill(color);
        graphics.drawCircle(0.0, 0.0, 1.0);
        graphics.endFill();
        return graphics;
      })
    );
  }

  render(world: RAPIER.World, debugRender: boolean) {
    kk += 1;

    if (!this.lines) {
      this.lines = new PIXI.Graphics();
      this.viewport.addChild(this.lines);
    }

    if (debugRender) {
      let buffers = world.debugRender();
      let vtx = buffers.vertices;
      let cls = buffers.colors;

      this.lines.clear();

      for (let i = 0; i < vtx.length / 4; i += 1) {
        let color = PIXI.utils.rgb2hex([
          cls[i * 8],
          cls[i * 8 + 1],
          cls[i * 8 + 2],
        ]);
        this.lines.lineStyle(1.0, color, cls[i * 8 + 3], 0.5, true);
        this.lines.moveTo(vtx[i * 4], -vtx[i * 4 + 1]);
        this.lines.lineTo(vtx[i * 4 + 2], -vtx[i * 4 + 3]);
      }
    } else {
      this.lines.clear();
    }

    this.updatePositions(world);
    this.renderer.render(this.scene);
  }

  lookAt(pos: { zoom: number; target: { x: number; y: number } }) {
    this.viewport.setZoom(pos.zoom);
    this.viewport.moveCenter(pos.target.x, pos.target.y);
  }

  updatePositions(world: RAPIER.World) {
    world.forEachCollider((elt) => {
      let gfx = this.coll2gfx.get(elt.handle);
      let translation = elt.translation();
      let rotation = elt.rotation();

      if (!!gfx) {
        gfx.position.x = translation.x;
        gfx.position.y = -translation.y;
        gfx.rotation = -rotation;
      }
    });
  }

  reset() {
    this.coll2gfx.forEach((gfx) => {
      this.viewport.removeChild(gfx);
      gfx.destroy();
    });
    this.coll2gfx = new Map();
    this.colorIndex = 0;
  }

  addCollider(collider: RAPIER.Collider) {
    let i;
    let parent = collider.parent()!;
    let instance;
    let graphics;
    let vertices;
    let instanceId = parent.isFixed() ? 0 : this.colorIndex + 1;

    switch (collider.shapeType()) {
      case RAPIER.ShapeType.Cuboid:
        let hext = collider.halfExtents();
        instance = this.instanceGroups[BOX_INSTANCE_INDEX][instanceId];
        graphics = instance.clone();
        graphics.scale.x = hext.x;
        graphics.scale.y = hext.y;
        this.viewport.addChild(graphics);
        break;
      case RAPIER.ShapeType.Ball:
        let rad = collider.radius();
        instance = this.instanceGroups[BALL_INSTANCE_INDEX][instanceId];
        graphics = instance.clone();
        graphics.scale.x = rad;
        graphics.scale.y = rad;
        this.viewport.addChild(graphics);
        break;
      case RAPIER.ShapeType.Polyline:
        vertices = Array.from(collider.vertices());
        graphics = new PIXI.Graphics();
        graphics
          .lineStyle(0.2, this.colorPalette[instanceId])
          .moveTo(vertices[0], -vertices[1]);

        for (i = 2; i < vertices.length; i += 2) {
          graphics.lineTo(vertices[i], -vertices[i + 1]);
        }

        this.viewport.addChild(graphics);
        break;
      case RAPIER.ShapeType.HeightField:
        let heights = Array.from(collider.heightfieldHeights());
        let scale = collider.heightfieldScale();
        let step = scale.x / (heights.length - 1);

        graphics = new PIXI.Graphics();
        graphics
          .lineStyle(0.2, this.colorPalette[instanceId])
          .moveTo(-scale.x / 2.0, -heights[0] * scale.y);

        for (i = 1; i < heights.length; i += 1) {
          graphics.lineTo(-scale.x / 2.0 + i * step, -heights[i] * scale.y);
        }

        this.viewport.addChild(graphics);
        break;
      case RAPIER.ShapeType.ConvexPolygon:
        vertices = Array.from(collider.vertices());
        graphics = new PIXI.Graphics();
        graphics.beginFill(this.colorPalette[instanceId], 1.0);
        graphics.moveTo(vertices[0], -vertices[1]);

        for (i = 2; i < vertices.length; i += 2) {
          graphics.lineTo(vertices[i], -vertices[i + 1]);
        }

        this.viewport.addChild(graphics);
        break;
      default:
        console.log('Unknown shape to render.');
        break;
    }

    let t = collider.translation();
    let r = collider.rotation();

    if (graphics) {
      graphics.position.x = t.x;
      graphics.position.y = -t.y;
      graphics.rotation = r;
      this.coll2gfx.set(collider.handle, graphics);
    }
    this.colorIndex = (this.colorIndex + 1) % (this.colorPalette.length - 1);
  }
}
