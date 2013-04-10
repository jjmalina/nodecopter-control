$(function () {

  var enableCopterStream = true;

  if (enableCopterStream) {
    var copterStream = new NodecopterStream(
      document.querySelector('#dronestream')
    );
  }

});
