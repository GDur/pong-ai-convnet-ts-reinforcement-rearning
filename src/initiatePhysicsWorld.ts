import RAPIER, { Vector, Vector2, World } from "@dimforge/rapier2d-compat"
import { RapierHelper } from "./RapierHelper"
import { Vector2 as GlVector2 } from "@math.gl/core"
import { Ai, PossibleActions } from "./ai"
import { Pane } from "tweakpane"
const PARAMS = {
  isTraining: true,
  actionCounter: "",
  frames: 0,
  currentAction: "none yet",
  zoomFactor: 10,
  translate: { x: 3.34, y: 25 },
  dt: 16,
}

const pane = new Pane()
// @ts-ignore
pane.addInput(PARAMS, "isTraining")
// @ts-ignore
pane.addInput(PARAMS, "zoomFactor")
// @ts-ignore
pane.addInput(PARAMS, "translate")
// @ts-ignore
// pane.addInput(PARAMS, "dt")

// @ts-ignore
pane.addMonitor(PARAMS, "actionCounter", {
  multiline: true,
  lineCount: 4,
})
// @ts-ignore
pane.addMonitor(PARAMS, "frames", {})
// @ts-ignore
pane.addMonitor(PARAMS, "currentAction", {})

/**
 * Wrapper helper to convert the Rapier Vector2 to GLVector2
 */
function v2(a?: Vector2 | Vector | GlVector2 | number, y?: number): GlVector2 {
  if (a === undefined) {
    console.error("error: v not defined")
  }
  if (typeof a === "number") {
    return new GlVector2(a, y)
  } else {
    let v = a as GlVector2
    return new GlVector2(v.x, v.y)
  }
}

const log = console.log.bind(document)
/**
 * Here you can change the gravity and add physics bodies
 */
export function initiatePhysicsWorld(world: World, helper: RapierHelper) {
  world.gravity = new RAPIER.Vector2(0.0, 0)

  // bottom wall
  helper.createComponent({
    position: v2(0, -10),
    colliderDesc: RAPIER.ColliderDesc.cuboid(10, 0.1),
    isFixed: true,
  })

  // top wall
  helper.createComponent({
    position: v2(0, 10),
    colliderDesc: RAPIER.ColliderDesc.cuboid(10, 0.1),
    isFixed: true,
    friction: 0,
  })

  // right wall
  const rightWall = helper.createComponent({
    position: v2(10, 0),
    colliderDesc: RAPIER.ColliderDesc.cuboid(10, 0.1),
    isFixed: true,
    rotation: Math.PI * 0.5,
    friction: 0,
  })

  // left wall
  helper.createComponent({
    position: v2(-5, 0),
    colliderDesc: RAPIER.ColliderDesc.cuboid(10, 0.1),
    isFixed: true,
    rotation: Math.PI * 0.5,
    friction: 0,
  })

  let ball = helper.createComponent({
    position: v2(0, 0),
    colliderDesc: RAPIER.ColliderDesc.ball(0.5),
    lockRotation: false,
    density: 1,
    restitution: 1,
    friction: 0,
  })

  ball.rigidBody!.setLinvel(new Vector2(20, 2), true)

  let playerPaddleX = 10 - 2
  const playerPaddle = helper.createComponent({
    position: v2(playerPaddleX, 0),
    colliderDesc: RAPIER.ColliderDesc.cuboid(2, 0.5),
    lockRotation: true,
    rotation: Math.PI * 0.5,
    friction: 0,
  })

  let ai = new Ai()

  ai.brain.epsilon_test_time = 0 // don't make any more random choices
  ai.brain.epsilon = 0
  //about 30 steps per second
  let gameLoop = () => {
    // progress physics simulation one step
    world.step()

    let ballRb = ball.rigidBody!
    let playerRb = playerPaddle.rigidBody!

    // after contact add correct velocity
    let t = v2(ballRb.linvel()).clone().normalize().scale(10)
    ballRb.setLinvel(t, true)

    let wasNotAbleToDeflectBall = false
    let contactedTheBall = false
    world.contactsWith(ball!.collider!, (otherCollider) => {
      if (otherCollider.handle === rightWall.collider!.handle) {
        log("ball contacted right wall")
        ballRb.setTranslation(
          new Vector2(Math.random() * 3 - 5, Math.random() * 10 - 5),
          true
        )
        ballRb.setLinvel(
          new Vector2(Math.random() * 2 - 1, Math.random() - 0.5),
          true
        )

        playerRb.setTranslation(v2(playerPaddleX, Math.random() * 10 - 5), true)
        wasNotAbleToDeflectBall = true
      }
      if (otherCollider.handle === playerPaddle.collider!.handle) {
        log("ball contacted paddle")
        contactedTheBall = true
      }
    })
    ai.learn({
      currentGameState: [
        //playerRb.translation().x,
        playerRb.translation().y,
        // playerRb.linvel().x,
        // playerRb.linvel().y,
        ballRb.translation().x,
        ballRb.translation().y,
      ],
      rewardCallback: () => {
        // very bad when the ball was missed
        if (wasNotAbleToDeflectBall) return -1

        // good when the ball was hit
        if (contactedTheBall) return 0.4

        // it is good when the ball is not hitting the wall
        return 0.05
      },
      actionCallback: (action) => {
        let paddleSpeed = 20

        if (action === PossibleActions.up) {
          playerRb.setLinvel(v2(0, paddleSpeed), true)
        }
        if (action === PossibleActions.down) {
          playerRb.setLinvel(v2(0, -paddleSpeed), true)
        }
      },
    })

    // make sure the x position is stable
    playerRb.setTranslation(v2(playerPaddleX, playerRb.translation().y), true)

    let brain = ai.brain
    if (PARAMS.isTraining) {
      PARAMS.dt = 0
      //brain.epsilon_test_time = 0.2; // don't make any more random choices
      brain.learning = true
    } else {
      PARAMS.dt = 30
      brain.epsilon_test_time = 0.001 // don't make any more random choices
      brain.learning = false
    }

    //PARAMS.actionCounter = JSON.stringify(actionCounter, null, 4)
    //PARAMS.currentAction = currentAction
    // PARAMS.frames = time
    // time++
    setTimeout(gameLoop, PARAMS.dt)
  }
  gameLoop()
  return world
}
