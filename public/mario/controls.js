/* Site adaptation of FullScreenMario. CC BY-NC-SA 3.0; see CREDITS.md. */
(function (root) {
  "use strict";
  // Run and fire deliberately have independent states, including on touch screens.
  root.MarioControls = function (game) {
    var held = {};
    var handlers = {
      left: ["keyDownLeft", "keyUpLeft"],
      right: ["keyDownRight", "keyUpRight"],
      jump: ["keyDownUp", "keyUpUp"],
      down: ["keyDownDown", "keyUpDown"],
    };
    var event = { preventDefault: function () {} };
    function release() {
      Object.keys(held).forEach(function (action) {
        input(action, false);
      });
      if (game.player) {
        game.player.keys.run = 0;
        game.player.keys.sprint = 0;
        game.player.keys.jump = 0;
        game.player.keys.up = 0;
        game.player.keys.crouch = 0;
      }
    }
    function input(action, pressed) {
      var player = game.player;
      if (!player || (pressed && game.GamesRunner.getPaused())) return;
      if (held[action] === pressed) return;
      held[action] = pressed;
      if (action === "run") player.keys.sprint = pressed ? 1 : 0;
      else if (action === "fire") {
        if (
          pressed &&
          player.power === 3 &&
          !player.crouch &&
          !game.MapScreener.nokeys
        )
          player.fire(player);
      } else if (handlers[action])
        game[handlers[action][pressed ? 0 : 1]](player, event);
    }
    return { input: input, release: release };
  };
})(globalThis);
