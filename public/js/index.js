(function () {

	/////////////////////////////////////////MAXI
	var myMod = 0;
	var myFreq = 256;
	function makeNoise(rOut) {
		myFreq = 256 + (1024 * rOut);
	}

	var maxiAudio = new maximJs.maxiAudio();
	var myWave = new maximJs.maxiOsc();
	var myLFO01 = new maximJs.maxiOsc();
	var myFilter = new maximJs.maxiFilter();
	maxiAudio.init();

	var mfSlider = document.getElementById("modFreqSlider");
	var mfOutput = document.getElementById("mfOutput");
	var mdSlider = document.getElementById("mdSlider");
	var mdOutput = document.getElementById("mfOutput");
	var cfSlider = document.getElementById("cfSlider");
	var cfOutput = document.getElementById("cfOutput");
	var qSlider = document.getElementById("qSlider");
	var qOutput = document.getElementById("qOutput");

	maxiAudio.play = function() {
		var LFO01 = (( myLFO01.sinewave(parseFloat(mfSlider.value)) + 1.0 )/ 2.0) * (mdSlider.value) + (1 - mdSlider.value);
		var oscOutput = myWave.pulse(83, LFO01);
		var cFreq = parseFloat(cfSlider.value);
		var res = parseFloat(qSlider.value);
		var myFilteredOutput = myFilter.lores(oscOutput, cFreq, res);
		this.output = myFilteredOutput;
	};

	////////////////////////////////////RAPID API

	var userID = -1;

	//======================= websocket initialization =========================//

	var WebSocket = window.WebSocket || window.MozWebSocket;
	var connection = new WebSocket('ws://' + window.location.host);

	connection.send = function(user, msg, data) {
		WebSocket.prototype.send.call(this, JSON.stringify({
			user: user,
			msg: msg,
			data: data
		}));
	};

	connection.onopen = function() {
		console.log('socket open');
		userID = Date.now();
	};

	connection.onerror = function() {
		console.log('socket error');
	};

	connection.onmessage = function(msg) {
		var m = JSON.parse(msg.data);
		if (m.user !== userID) return;
		switch (m.msg) {
			case 'model':
				gmmDecoder.model = m.data;
				console.log("model " + JSON.stringify(m.data));
				break;

			default:
				break;
		}
	};

	//================= XMM gesture recorder / model decoder ===================//

	var phraseMaker = new xmmClient.PhraseMaker();
	phraseMaker.config = {
		bimodal: true,
		dimension: 6,
		dimension_input: 2,
		column_names: ['mouseX', 'mouseY', 'fader1', 'fader2', 'fader3', 'fader4'],
		label: 'gesture'
	};

	var gmmDecoder = new xmmClient.GmmDecoder();
	var trained = false;
	function trainMe() {
		connection.send(userID, 'phrase', phraseMaker.phrase);
		trained = true;
	}

	function process(input) {
		gmmDecoder.filter(input, function(err,res) {
			if (!err) {
				console.log(res);
				/*
				 mfSlider.value = regressionOutput[0];

				 mdSlider.value = regressionOutput[1];
				 cfSlider.value = regressionOutput[2];
				 qSlider.value = regressionOutput[3];
				 updateOutputs();
				 */
			}
		});
	}
	////////////////////////////////////CONTROLS AND INPUT


	// This is where we are going to store the mouse information
	var mouseX;
	var mouseY;
	var myOutput = '(use number keys)';

	// This gets a reference to the canvas in the browser
	var canvas = document.querySelector("canvas");

	// This sets the width and height to the document window
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight - 300;
	// Be aware that when you resize the window, you will need to call (do) this again

	// This creates a 2d drawing 'context' in your canvas
	// All your drawing will be done in this canvas
	var context = canvas.getContext("2d");
	//This tells the browser to get the mouse information from the function we've called getMouse
	canvas.addEventListener('mousemove', getMouse, false);

	function getMouse(mousePosition) {
		if (mousePosition.layerX || mousePosition.layerX === 0) {
			mouseX = mousePosition.layerX / canvas.width;
			mouseY = mousePosition.layerY / canvas.height;
		} else if (mousePosition.offsetX || mousePosition.offsetX === 0) {
			mouseX = mousePosition.offsetX / canvas.width;
			mouseY = mousePosition.offsetY / canvas.height;
		}

		if (recordState) {
			var myObservation = [mouseX, mouseY, mfSlider.value, mdSlider.value, cfSlider.value, qSlider.value];
			phraseMaker.addObservation(myObservation);
			console.log('pm ', phraseMaker.phrase);
		}

		if (runState) {
			var rapidInput = [mouseX, mouseY];
			process(rapidInput);
		}
	}

	window.addEventListener('keydown',this.check,false);
	function check(e) {
		//console.log(e.keyCode);
		switch (e.keyCode) {
			case 88:
				togRecord();
				break;
			case 82:
				togRun();
				break;
			case 84:
				trainMe();
				break;
			default:
				myOutput = e.keyCode - 48;
		}
	}

	var recordState;
	function togRecord() {
		recordState = !recordState;
		if (recordState) {
			phraseMaker.reset();
			console.warn("recording!");
		} else {
			console.log("stopped recording");
		}
	}

	var runState;
	function togRun() {
		runState = !runState;
		console.log("running");
	}

	function randomize() {
		mfSlider.value = 4096 * Math.random();
		mdSlider.value = 1.0 * Math.random();
		cfSlider.value = 4096 * Math.random();
		qSlider.value = 40 * Math.random();
		updateOutputs();
	}

	function updateOutputs() {
		mfOutput.value = mfSlider.value;
		mdOutput.value = mdSlider.value;
		cfOutput.value = cfSlider.value;
		qOutput.value = qSlider.value;
	}

	/////////////////Drawing
	function draw() {
		context.clearRect(0,0, canvas.width, canvas.height);
		//record state
		context.fillStyle = "#00FF00";
		context.font="24px Verdana";
		if (recordState) {
			context.fillText('RECORDING! (x)', 20, 100);
		} else {
			context.fillText('x = record', 20, 100);
		}
		if (trained) {
			context.fillText('(T)RAINED!', 20, 125);
		} else {
			context.fillText('t = train', 20, 125);
		}
		if (runState) {
			context.fillText('(R)UNNING!', 20, 150);
		} else {
			context.fillText('r = run', 20, 150);
		}


		//mouse coordinates
		context.font="12px Verdana";
		context.fillText('(' + mouseX + ', ' + mouseY + ')' , 20, canvas.height - 50);



		window.requestAnimationFrame(draw);
	}
	window.requestAnimationFrame(draw)

})();