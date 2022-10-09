import RAPIER, {
  ColliderDesc,
  RigidBodyType,
  Vector2,
} from '@dimforge/rapier2d-compat';
import { RapierRenderer } from './RapierRenderer';

/**
 * Components which can be added to a {@link GameObject}.
 */
export interface Components {
  collider?: RAPIER.Collider;
  rigidBody?: RAPIER.RigidBody;
}

export interface PhysicOptions {
  position: Vector2;
  colliderDesc: ColliderDesc;
  density?: number;
  isFixed?: boolean;
  collisionGroups?: number;
  lockRotation?: boolean;
  lockTranslation?: boolean;
  restitution?: number;
  friction?: number;
  mass?: number;
  isSensor?: boolean;
  rotation?: number;
}

export class RapierHelper {
  constructor(
    public world: RAPIER.World,
    public rapierRenderer: RapierRenderer
  ) {}

  createComponent({
    position: position,
    density,
    colliderDesc,
    isFixed = false,
    collisionGroups,
    lockRotation = false,
    lockTranslation = false,
    restitution,
    friction,
    mass,
    isSensor,
    rotation,
  }: PhysicOptions): Components {
    let bodyDesc = isFixed
      ? RAPIER.RigidBodyDesc.fixed()
      : RAPIER.RigidBodyDesc.dynamic();

    bodyDesc.setLinearDamping(0).setAngularDamping(0);
    bodyDesc.setTranslation(position.x, position.y);

    let rigidBody = this.world.createRigidBody(bodyDesc);
    rigidBody.lockTranslations(lockTranslation, true);
    rigidBody.lockRotations(lockRotation, lockRotation);

    colliderDesc.setRotation(rotation !== undefined ? rotation : 0);
    colliderDesc.setFrictionCombineRule(RAPIER.CoefficientCombineRule.Max);

    let collider = this.world.createCollider(colliderDesc, rigidBody);
    collider.setDensity(density !== undefined ? density : collider.density());

    collider.setCollisionGroups(
      collisionGroups !== undefined
        ? collisionGroups
        : collider.collisionGroups()
    );
    collider.setRestitution(
      restitution !== undefined ? restitution : collider.restitution()
    );
    collider.setFriction(
      friction !== undefined ? friction : collider.friction()
    );

    collider.setMass(mass !== undefined ? mass : collider.mass());

    collider.setSensor(isSensor !== undefined ? isSensor : collider.isSensor());

    this.rapierRenderer.addCollider(collider);
    return { rigidBody, collider };
  }
}
