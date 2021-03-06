/**
 * PlayerState_Static
 * ------------------
 * Holds static state for a player, such as their skills
 * and abilities, maximum speed and so on.
 *
 * These values may not be entirely static throughout a game.
 * Some can change, for example as a result of injuries. But they
 * are much more 'static' than other more dynamic attributes such
 * as the player's position.
 *
 * Skills and other attributes are values between 0.0 - 100.0, unless
 * otherwise indicated.
 */

/**
 * @constructor
 */
function PlayerState_Static(playerNumber, playerType) {
    // The player number (unique across both teams)...
    this.playerNumber = playerNumber;

    // The player type (player or goalkeeper)...
    this.playerType = playerType;

    // How accurately the player kicks the ball, for passing and other kicking...
    this.kickingAbility = 0.0;

    // How fast the player can run...
    this.runningAbility = 0.0;

    // How good the player is at controlling the ball. This is used
    // when taking possession of the ball...
    this.ballControlAbility = 0.0;

    // How good the player is at tackling...
    this.tacklingAbility = 0.0;
}

/**
 * An enum for types of player.
 */
PlayerState_Static.PlayerType = {
    PLAYER: 'P',
    GOALKEEPER: 'G'
};

// Exports...
module.exports = PlayerState_Static;

