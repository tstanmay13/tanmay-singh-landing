/* Homepage integration by Tanmay Singh. CC BY-NC-SA 3.0; see CREDITS.md. */
(function () {
  "use strict";
  var game,
    controls,
    statusTimer,
    lastStatus = "",
    paused = true;
  function send(type, data) {
    parent.postMessage(
      Object.assign({ source: "tanmay-mario", type: type }, data || {}),
      location.origin,
    );
  }
  function resize() {
    var scale = Math.min(innerWidth / 512, innerHeight / 464);
    var element = document.getElementById("game");
    element.style.transform = "translate(-50%, -50%) scale(" + scale + ")";
  }
  function pause() {
    if (!game) return;
    controls.release();
    game.GamesRunner.pause();
    game.AudioPlayer.pauseAll();
    paused = true;
    send("paused");
  }
  function resume() {
    if (!game) return;
    game.GamesRunner.play();
    paused = false;
    send("playing");
  }
  var keys = {
    ArrowLeft: "left",
    a: "left",
    ArrowRight: "right",
    d: "right",
    ArrowUp: "jump",
    w: "jump",
    " ": "jump",
    z: "jump",
    ArrowDown: "down",
    s: "down",
    Shift: "run",
    x: "fire",
    k: "fire",
  };
  function key(event, pressed) {
    var action =
      keys[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (action) {
      event.preventDefault();
      controls.input(action, pressed);
    }
    if (
      pressed &&
      !event.repeat &&
      (event.key === "p" || event.key === "Escape")
    ) {
      event.preventDefault();
      pause();
      if (event.key === "Escape") send("exit");
    }
  }
  window.addEventListener("message", function (event) {
    if (
      event.origin !== location.origin ||
      event.source !== parent ||
      event.data?.source !== "tanmay-home"
    )
      return;
    var data = event.data;
    if (!game) return;
    if (data.type === "input") controls.input(data.action, !!data.pressed);
    else if (data.type === "release") controls.release();
    else if (data.type === "pause") pause();
    else if (data.type === "resume") resume();
    else if (data.type === "sound") game.AudioPlayer.setMuted(!data.enabled);
    else if (data.type === "stage" && /^[1-8]-[1-4]$/.test(data.stage)) {
      controls.release();
      game.StatsHolder.set("power", 1);
      game.StatsHolder.set("lives", 3);
      game.setMap(data.stage);
      resume();
    }
  });
  try {
    game = new FullScreenMario({ width: 512, height: 464 });
    game.AudioPlayer.setMuted(true);
    controls = new MarioControls(game);
    document.getElementById("game").appendChild(game.container);
    game.gameStart();
    paused = false;
    resize();
    document.addEventListener("keydown", function (e) {
      key(e, true);
    });
    document.addEventListener("keyup", function (e) {
      key(e, false);
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause();
    });
    window.addEventListener("resize", resize);
    statusTimer = setInterval(function () {
      var status = {
        world: String(game.StatsHolder.get("world")),
        coins: game.StatsHolder.get("coins"),
        score: game.StatsHolder.get("score"),
        power: game.player?.power || 1,
      };
      var serialized = JSON.stringify(status);
      if (serialized !== lastStatus) {
        lastStatus = serialized;
        send("status", status);
      }
      if (paused && !game.GamesRunner.getPaused()) game.GamesRunner.pause();
    }, 150);
    send("ready");
  } catch (error) {
    document.getElementById("error").hidden = false;
    send("error");
    console.error("Mario startup failed", error);
  }
  window.addEventListener("pagehide", function () {
    pause();
    clearInterval(statusTimer);
  });
})();
