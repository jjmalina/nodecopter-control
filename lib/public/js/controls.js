// Copyright (c) 2013 Jeremiah Malina (http://github.com/jmalina327)

//  Permission is hereby granted, free of charge, to any person obtaining a copy
//  of this software and associated documentation files (the "Software"), to deal
//  in the Software without restriction, including without limitation the rights
//  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//  copies of the Software, and to permit persons to whom the Software is
//  furnished to do so, subject to the following conditions:

//  The above copyright notice and this permission notice shall be included in
//  all copies or substantial portions of the Software.

//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//  THE SOFTWARE.

(function (window, document, $, _, Mousetrap) {
  'use strict';

  var CopterControl = function(window) {
    this.init(window);
  };

  CopterControl.prototype = {
    init: function (window) {
      if (!("WebSocket" in window)) {
        this.error("WebSockets not enabled, aborting.");
        return;
      }

      ////
      //// attributes
      ////
      this.connected = false;
      this.speedIncrementIntervalTick = 50;
      this.controlIntervalTick = 100;
      this.controlStartSpeed = 0.1;
      this.controlMaxSpeed = 1.0;

      ////
      //// flight status
      ////
      this.flying = false;

      ////
      //// connection to server
      ////
      this.initWebSockets(window);

      ////
      //// key listeners
      ////
      this.initKeyListeners();
    },

    initWebSockets: function (window) {
      this.socket = new WebSocket(
        'ws://' +
        window.location.hostname + ':' +
        window.location.port + "/drone"
      );
      this.socket.onopen = function () {
        console.log("Connection made");
        this.connected = true;
      };
      this.socket.onmessage = $.proxy(this.incoming, this);
      console.log(this.socket);
    },

    /*
     * Sets the key bindings
     * Requires Mousetrap (https://github.com/ccampbell/mousetrap)
     */
    initKeyListeners: function () {
      var keys = [
        ['t', 84, this.takeoff],
        ['l', 76, this.land],
        ['up', 38, this.up],
        ['down', 40, this.down],
        ['w', 87, this.front],
        ['s', 83, this.back],
        ['a', 65, this.left],
        ['d', 68, this.right],
        ['right', 39, this.clockwise],
        ['left', 37, this.counterClockwise],
        ['x', 88, this.stop]],
        keyIndex,
        key;
      this._keys = {};
      for (keyIndex in keys) {
        key = keys[keyIndex];
        this._keys[key[1]] = {
          key: key[0],
          fn: key[2],
          pressed: false,
          speed: this.controlStartSpeed
        };
        Mousetrap.bind(key[0], $.proxy(this.enqueueKey, this), 'keydown');
        Mousetrap.bind(key[0], $.proxy(this.dequeueKey, this), 'keyup');
      }
    },

    enqueueKey: function (e) {
      var speed, key = this._keys[e.keyCode];
      key.pressed = true;
      speed = this.speedMultiplier(key.speed);
      key.speed = speed > this.controlMaxSpeed ? this.controlMaxSpeed : speed;
      key.fn(this, key.speed);
    },

    dequeueKey: function (e) {
      this._keys[e.keyCode].pressed = false;
      this._keys[e.keyCode].speed = this.controlStartSpeed;
    },

    speedMultiplier: function (speed) { return speed * 1.25; },

    send: function (message) {
      console.log(message);
      this.socket.send(message);
    },

    incoming: function (message) {
      if (message.data.size === undefined) {
        var data = JSON.parse(message.data);
        if (data.droneStatus !== undefined)
          this.updateDroneStatus(data.droneStatus);
      }
    },

    error: function (message) {
      console.log("ERROR: " + message);
    },

    sendControl: function (command) {
      var message = "CONTROL:" + command;
      this.send(message);
    },

    sendFlightControl: function (command) {
      if (this.flying)
        this.sendControl(command);
      else
        this.error("Cannot issue command until drone has taken off");
    },

    takeoff: function (self) {
      self.sendControl("takeoff");
      self.flying = true;
    },

    land: function (self) {
      self.sendControl("land");
      self.flying = false;
    },
    up:   function (self, speed) { self.sendFlightControl("up:" + speed); },
    down: function (self, speed) { self.sendFlightControl("down:" + speed); },
    front:function (self, speed) { self.sendFlightControl("front:" + speed); },
    back: function (self, speed) { self.sendFlightControl("back:" + speed); },
    left: function (self, speed) { self.sendFlightControl("left:" + speed); },
    right: function (self, speed) { self.sendFlightControl("right:" + speed); },
    clockwise: function (self, speed) {
      self.sendFlightControl("clockwise:" + speed);
    },
    counterClockwise: function (self, speed) {
      self.sendFlightControl("counterClockwise:" + speed);
    },
    stop:             function (self) { self.sendControl("stop"); },
    disableEmergency: function (self) { self.sendControl("disableEmergency"); },

    updateDroneStatus: function (droneStatus) {
      for (var key in droneStatus) {
        $('#drone-demo li span.' + key).html(' ' + droneStatus[key]);
      }
    }
  };

  window.CC = new CopterControl(window);

})(window, document, $, _, Mousetrap);
