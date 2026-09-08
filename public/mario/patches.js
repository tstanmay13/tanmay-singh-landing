/* Homepage adaptation. CC BY-NC-SA 3.0; see CREDITS.md. */
(function () {
  "use strict";
  // Pausing a just-started sound is normal when the tab or game loses focus.
  if (typeof HTMLMediaElement !== "undefined") {
    var play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      var result = play.apply(this, arguments);
      return (
        result &&
        result.catch(function (error) {
          if (error.name !== "AbortError" && error.name !== "NotAllowedError")
            throw error;
        })
      );
    };
  }
  var proto = FullScreenMario.prototype;
  // Remove the remake's billboard/tutorial overlay, preserving every playable
  // object and original coordinate in the opening course.
  var intro = proto.settings.maps.library["1-1"].areas[0];
  intro.creation = intro.creation.filter(function (item) {
    return !["CustomText", "DecorativeBack", "DecorativeDot"].includes(
      item.thing,
    );
  });
  var coin = proto.animateEmergeCoin;
  proto.animateEmergeCoin = function (thing, block) {
    coin.call(this, thing, block);
    // The original pop already awards points. Only animate the text here.
    thing.EightBitter.scoreOn(200, thing, true);
  };
  // Object settings capture callbacks before instantiation. Keep them aligned.
  proto.settings.objects.properties.Coin.animate = proto.animateEmergeCoin;
})();
