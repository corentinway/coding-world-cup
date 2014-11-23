/**
 * Player
 * ------
 * Information about one player and methods to control them.
 *
 * The information includes dynamic data such as the player's current
 * position and speed, as well as more static / config data such as
 * the player's skills and abilities.
 *
 * Most, but not all, of the data is serialized and passed to AIs
 * each turn of the game. Some data - in particular the player's
 * actions are private, and are only available to the AI which
 * is controlling the player.
 */
var PlayerState_Dynamic = require('./PlayerState_Dynamic');
var PlayerState_Static = require('./PlayerState_Static');
var PlayerState_Action = require('./PlayerState_Action');
var UtilsLib = require('../utils');
var Utils = UtilsLib.Utils;
var CWCError = UtilsLib.CWCError;


/**
 * @constructor
 */
function Player(playerNumber, playerType) {
    // Dynamic state (position etc)...
    this.dynamicState = new PlayerState_Dynamic();

    // Static state (skills, abilities etc)...
    this.staticState = new PlayerState_Static(playerNumber, playerType);

    // Current action (moving, kicking etc)...
    this.actionState = new PlayerState_Action();
}

/**
 * Maximum running speed, in metres/second.
 * If a player has runningAbility of 100.0 and chooses to run at
 * 100% speed, they will run at this rate.
 */
Player.MAX_SPEED = 10.0;

/**
 * The maximum energy that any player can have. All players start with
 * this energy. (Though players recuperate at different rates depending
 * on their stamina.)
 */
Player.MAX_ENERGY = 100.0;

/**
 * The maximum rate at which players turn, in degrees/second.
 */
Player.MAX_TURNING_RATE = 600.0;

/**
 * isPlayer
 * --------
 * Returns true if this player is a player (ie, not a goalkeeper).
 */
Player.prototype.isPlayer = function() {
    return this.staticState.playerType === PlayerState_Static.PlayerType.PLAYER;
};

/**
 * isGoalkeeper
 * ------------
 * Returns true if this player is a goalkeeper.
 */
Player.prototype.isGoalkeeper = function() {
    return this.staticState.playerType === PlayerState_Static.PlayerType.GOALKEEPER;
};

/**
 * updatePosition
 * --------------
 * Moves or turns the player based on their current action, speed
 * and so on, and on the time elapsed since the previous update.
 */
Player.prototype.updatePosition = function(game) {
    switch(this.actionState.action) {
        case PlayerState_Action.Action.TURN:
            this.updatePosition_Turn(game, true);
            break;

        case PlayerState_Action.Action.MOVE:
            this.updatePosition_Move(game, true);
            break;
    }
};

/**
 * updatePosition_Turn
 * -------------------
 * Turns the player towards their desired direction.
 */
Player.prototype.updatePosition_Turn = function(game, resetActionWhenComplete) {
    // We work out whether we should be turning left or right...
    var currentDirection = this.dynamicState.direction;
    var desiredDirection = this.actionState.direction;

    var angleToTurn = desiredDirection - currentDirection;
    if(angleToTurn > 180) {
        // We are turning more than 180 degrees to the right,
        // so this is really a turn to the left...
        angleToTurn = angleToTurn - 360;
    }
    if(angleToTurn < -180) {
        // We are turning more than 180 degrees to the left,
        // so this is really a turn to the right...
        angleToTurn = 360 + angleToTurn;
    }

    // We change this to an abs(angle) and a direction...
    var directionToTurn = 1.0;
    if(angleToTurn < 0) {
        angleToTurn = -1.0 * angleToTurn;
        directionToTurn = -1.0;
    }

    // We find the maximum angle that can be turned in the interval
    // since the last update. We may need to cap the angle we move...
    var maxAngle = Player.MAX_TURNING_RATE * game.getCalculationIntervalSeconds();
    if(angleToTurn > maxAngle) {
        angleToTurn = maxAngle;
    }

    // We turn by the amount, and check if we've gone past 360 degrees...
    var newDirection = currentDirection + angleToTurn * directionToTurn;
    if(newDirection > 360.0) {
        newDirection -= 360.0;
    }
    if(newDirection < 0) {
        newDirection += 360.0;
    }

    // We set the new direction...
    this.dynamicState.direction = newDirection;

    // If we are now facing in the desired direction, we stop turning...
    if(Utils.approxEqual(newDirection, desiredDirection) && resetActionWhenComplete === true) {
        this.actionState.action = PlayerState_Action.Action.NONE;
    }
};

/**
 * updatePosition_Move
 * -------------------
 * Moves the player towards their desired position.
 */
Player.prototype.updatePosition_Move = function(game, resetActionWhenComplete) {
    var position = this.dynamicState.position;
    var destination = this.actionState.destination;

    // We check if the player is facing the right way...
    var currentDirection = this.dynamicState.direction;
    var directionToDestination = Utils.angleBetween(position, destination);
    if(!Utils.approxEqual(currentDirection, directionToDestination)) {
        // We are not currently facing the right way, so we turn first...
        this.actionState.direction = directionToDestination;
        this.updatePosition_Turn(game, false);
        return;
    }

    // We are facing the right direction, so we can move towards
    // the destination at the player's current speed...
    var distanceToDestination = position.distanceTo(destination);
    var distanceToMove = this.getSpeed() * game.getCalculationIntervalSeconds();
    if(distanceToDestination < distanceToMove) {
        distanceToMove = distanceToDestination;
    }

    // We find the vector to the destination, and scale it by the
    // distance to move...
    var vectorToDestination = position.vectorTo(destination);
    var scaleFactor = distanceToMove / distanceToDestination;
    var scaledVector = vectorToDestination.scale(scaleFactor);

    // We move the player...
    position.addVector(scaledVector);

    // If the player is now at the destination, we stop him moving...
    if(position.approxEqual(destination) && resetActionWhenComplete === true) {
        this.actionState.action = PlayerState_Action.Action.NONE;
    }
};

/**
 * getSpeed
 * --------
 * Returns the current speed the player will move at in m/s.
 * This is a function of the player's max speed and current energy.
 */
Player.prototype.getSpeed = function() {
    var runningAbility = this.staticState.runningAbility / 100.0;
    var energy = this.dynamicState.energy / 100.0;
    var speed = runningAbility * energy * Player.MAX_SPEED;
    return speed;
};

/**
 * getDTO
 * --------------
 * Returns an object holding the player's state.
 *
 * If publicOnly is true, then only the dynamic state is
 * returned. If false, all the state is returned.
 */
Player.prototype.getDTO = function(publicOnly) {
    var state = {};
    state.dynamic = this.dynamicState;
    state.config = this.staticState;
    if(!publicOnly) {
        // We want to include the private jsonData as well...
        state.action = this.actionState;
    }
    return state;
};

/**
 * getPlayerNumber
 * ---------------
 * Helper function to get the player number.
 */
Player.prototype.getPlayerNumber = function() {
    return this.staticState.playerNumber;
};

/**
 * setAction
 * ---------
 * Sets the current action from the data passed in (which usually
 * originated from an AI).
 */
Player.prototype.setAction = function(action) {
    // The action should have an "action" member specifying
    // which action to perform. We look for a function called
    // _setAction_[action] to parse the specific parameters for
    // this action...
    if(!('action' in action)) {
        throw new CWCError('Expected "action" field in response');
    }
    var setActionMethodName = '_setAction_' + action.action;
    if(!(setActionMethodName in this)) {
        throw new CWCError('No method found to process action: ' + action.action);
    }
    this[setActionMethodName](action);
};

/**
 * _setAction_MOVE
 * ---------------
 * Processes a MOVE action.
 */
Player.prototype._setAction_MOVE = function(action) {
    // We expect the action to have "destination" and "speed" fields...
    if(!('destination' in action)) {
        throw new CWCError('Expected "destination" field in MOVE action');
    }
    if(!('speed' in action)) {
        throw new CWCError('Expected "speed" field in MOVE action');
    }
    this.actionState.action = PlayerState_Action.Action.MOVE;
    this.actionState.destination.copyFrom(action.destination);
    this.actionState.speed = action.speed;
};

/**
 * _setAction_TURN
 * ---------------
 * Processes a TURN action.
 */
Player.prototype._setAction_TURN = function(action) {
    // We expect the action to have a "direction" field...
    if(!('direction' in action)) {
        throw new CWCError('Expected "direction" field in TURN action');
    }
    this.actionState.action = PlayerState_Action.Action.TURN;
    this.actionState.direction = action.direction;
};

/**
 * _setAction_KICK
 * ---------------
 * Sets the action to kick the ball.
 */
Player.prototype._setAction_KICK = function(action) {
    // We expect the action to have "destination" and "speed" fields...
    if(!('destination' in action)) {
        throw new CWCError('Expected "destination" field in KICK action');
    }
    if(!('speed' in action)) {
        throw new CWCError('Expected "speed" field in KICK action');
    }
    this.actionState.action = PlayerState_Action.Action.KICK;
    this.actionState.destination.copyFrom(action.destination);
    this.actionState.speed = action.speed;
};

// Exports...
module.exports = Player;

