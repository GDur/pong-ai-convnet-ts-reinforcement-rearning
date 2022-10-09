import { deepqlearn } from "convnetjs-ts"

const PARAMS = {
  isTraining: true,
  actionCounter: "",
  frames: 0,
  currentAction: "none yet",
  zoomFactor: 10,
  translate: { x: 3.34, y: 25 },
  dt: 16,
}

export function sigmoid(z: number) {
  let k = 2
  return 1 / (1 + Math.exp(-z / k))
}

export enum PossibleActions {
  up,
  down,
}

export class Ai {
  brain: deepqlearn.Brain
  actionCounter: any

  constructor() {
    const brainOpt: deepqlearn.BrainOptions = {
      start_learn_threshold: 1000,
      hidden_layer_sizes: [10, 5, 5],
      experience_size: 30000,
      gamma: 0.7,
      learning_steps_total: 20000,
      learning_steps_burnin: 300,
      epsilon_min: 0.05,
      epsilon_test_time: 0.05,
    }

    let outActionCount = Object.keys(PossibleActions).length / 2
    const brain = new deepqlearn.Brain(3, outActionCount, brainOpt)

    this.actionCounter = {}

    console.log(PossibleActions)

    for (let i = 0; i < outActionCount; i++) {
      console.log("i", i)
      this.actionCounter[PossibleActions[i]] = 0
    }
    let time = 0
    brain.epsilon_test_time = 0 // don't make any more random choices
    brain.epsilon = 0
    this.brain = brain
  }

  learn({
    currentGameState,
    rewardCallback,
    actionCallback,
  }: {
    currentGameState: number[]
    rewardCallback: () => number
    actionCallback: (number: number) => void
  }) {
    let brain = this.brain
    const action = brain.forward(currentGameState.map((e) => sigmoid(e)))

    let reward = rewardCallback()
    /** REWARDS END */

    brain.backward(reward)

    let currentAction = PossibleActions[action]
    // count up how often each action was chosen to see trends :)
    this.actionCounter[currentAction]++
    actionCallback(action)

    if (PARAMS.isTraining) {
      PARAMS.dt = 180
      //brain.epsilon_test_time = 0.2; // don't make any more random choices
      brain.learning = true
    } else {
      PARAMS.dt = 12
      brain.epsilon_test_time = 0.001 // don't make any more random choices
      brain.learning = false
    }

    PARAMS.actionCounter = JSON.stringify(this.actionCounter, null, 4)
    PARAMS.currentAction = currentAction
    // PARAMS.frames = time;
    // time++;
  }
}
