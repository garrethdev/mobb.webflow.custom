// Mobb Constants:
var localStorage = window.localStorage;
var storageKeys = {
	email: 'email',
	firstName: 'firstName',
	videoStartTime: 'videoStartTime',
	videosPlayed: 'videosPlayed'
};
var closeButtonSelector = 'button.mobb-modal-toggle';
var formSelector = 'form[name="email-form"]';
var moduleFormSelector = '#podcast-module';
var modelSelector = '#email-signup-modal';
var podcastForm;
var host = window.location.host;
var prodHost = 'https://api.mobb.co';
var isLocal = strIncludes(host, 'localhost') || strIncludes(host, '127.0.0.1');
var serverUrl = isLocal ? 'http://localhost:4040/api' : prodHost + '/api';

/**
 * ========================= Storage File ==================================
 */

/**
 * JSON parse with error
 * @param  {String} data - Data in string format to be parsed to json
 * @return {*|null}
 */
function parseJSON(data) {
	try {
		return JSON.parse(data);
	} catch (e) {
		// console.error('Oops! Some problems parsing data');
	}
	return null;
}

/**
 *
 * @param {String} key - Key in which the data is to be stored
 * @param {*} value - Value to be stored in the storage
 */
function setStorageItem(key, value) {
	try {
		var toBeStored = value;
		if (typeof toBeStored === 'object') {
			toBeStored = JSON.stringify(toBeStored);
		}
		localStorage.setItem(key, toBeStored);
	} catch (e) {
		console.error('Error in storing value to storage: ', e);
	}
}

/**
 *
 * @param {String} key - Key to be retrieved from storage
 * @param {*} fallbackValue - fallback data if getting value from storage is empty/fails
 */
function getStorageItem(key, fallbackValue) {
	var result = localStorage.getItem(key);
	return parseJSON(result) || result || fallbackValue;
}

/**
 * Removes a single item from the storage
 * @param  {String} key - Key to be removed from storage
 */
function removeStorageItem(key) {
	localStorage.removeItem(key)
}

/**
 * Clear all storage
 */
function clearStorage() {
	localStorage.clear();
}

/**
 * ========================= Modal and other utils File ==================================
 */

/**
 * Returns if the modal is open
 */
function isModalOpen() {
	return $(modelSelector).hasClass('is-visible');
}

/**
 * Extract value from the node using selector
 * @param {String} selector - Selector from which value is to be fetched
 */
function extractFromSelector(selector) {
	var nodes = $(selector);
	if (nodes.length < 2) {
		return nodes.length ? $(nodes).val() : null;
	}
	var values = $.map(nodes, function (item) {
		return $(item).val();
	});
	var value = '';
	values.forEach(function (val) {
		if (!value) {
			value = val;
		}
	});
	return value;
}

/**
 * Show model helper with other things
 * @param {boolean} preventClose - Prevents user to close the popup
 */
function showModal(preventClose) {
	$(closeButtonSelector).show();
	$(modelSelector).addClass('is-visible');
	$(modelSelector + ' .mobb-modal-overlay').addClass('mobb-modal-toggle');
	$('.mobb-modal').css({ top: window.scrollY });
	if (preventClose) {
		$(closeButtonSelector).hide();
		$(modelSelector + ' .mobb-modal-overlay').removeClass('mobb-modal-toggle');
	}
	document.body.style.overflow = 'hidden';
}

/**
 * Hide model helper with other things
 */
function hideModal() {
	$(modelSelector).removeClass('is-visible');
	document.body.style.overflow = 'auto';
}

/**
 * Checks query params and store the details in local storage to mark the user as logged in.
 */
function checkQueryParams() {
	try {
		var search = location.search.substring(1);
		if (search) {
			var params = JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
			if (params.firstName) {
				setStorageItem(storageKeys.firstName, params.firstName);
			}
			if (params.email) {
				setStorageItem(storageKeys.email, params.email);
			}
			makeUserUpdateAPICall();
		}
	} catch (e) {
		console.error('error in get query params: ', e);
	}
}

/**
 * 
 * @param {String} str - String to be checked against
 * @param {String} value - Value to be checked in the string
 */
function strIncludes(str, value) {
	return str.indexOf(value) !== -1;
}

/**
 * Checks if the url is internal url or not
 * @param {String} url - Url to be checked if it is internal or not
 */
function checkIfUrlIsInternal(url) {
	return strIncludes(url, 'localhost') || strIncludes(url, '127.0.0.1') || strIncludes(url, window.location.hostname);
}

/**
 * ========================= Sign In Checker File ==================================
 */

/**
 * Checks if we need to block the users redirection
 * @param {ClickEvent} event 
 */
function checkRedirection(event) {
	var runOnThisPage = window.location.pathname === '/';
	const link = event.currentTarget.href;
	if (runOnThisPage && checkIfUrlIsInternal(link)) {
		var loggedIn = checkSignUp();
		if (!loggedIn) {
			event.preventDefault();
		}
	}
}

/**
 * Checks if the user has submitted the details
 * @param {boolean} preventClose - Prevents user to close the popup 
 */

function checkSignUp(preventClose) {
	var runOnThisPage = true;
	var email = getStorageItem(storageKeys.email);
	if (!email && runOnThisPage) {
		var isOpened = isModalOpen();
		if (!isOpened) {
			showModal(preventClose);
		}
	}
	return !!email;
}

/**
 * Make call to server to update or create the user details
 */
function makeUserUpdateAPICall() {
	var email = extractFromSelector(formSelector + ' input[name="Email"]');
	var firstName = extractFromSelector(formSelector + ' input[name="Name"]');
	var userPayload = {
		email: email,
		firstName: firstName
	};
	if (!userPayload.email) {
		console.log('There is no user information to submit to the server!');
		return false;
	}
	$.post(serverUrl + '/users', userPayload).done(function (response) {
		console.log('Posted data to server');
		setStorageItem(storageKeys.email, userPayload.email);
		setStorageItem(storageKeys.firstName, userPayload.firstName);
		// TODO: Show message/notification to user
		hideModal();
		$(modelSelector + ' .w-form-fail').hide();
	}).fail(function (er) {
		$(modelSelector + ' .w-form-fail').show();
		console.error('Error in submitting data to server');
	});
}

/**
 * Get user details from form and update the server with user details
 */
function signupUser(event) {
	event.preventDefault();
	makeUserUpdateAPICall();
}

/**
 * Generates a modal and appends it to body
 */
function createModalInBody() {
	var modalBody = document.createElement('div');
	modalBody.id = 'email-signup-modal';
	modalBody.className = 'mobb-modal';
	modalBody.innerHTML = `
		<div class="mobb-modal-overlay mobb-modal-toggle"></div>
    <div class="mobb-modal-wrapper mobb-dark-bg mobb-modal-transition">
      <div class="mobb-modal-header">
        <button class="mobb-modal-close mobb-modal-toggle">X</button>
        <h2 class="mobb-modal-heading">Weekly Advice & Inspiration</h2>
      </div>

      <div class="mobb-modal-body mobb-dark-bg">
				<div class="mobb-modal-content">
					<div class="w-form">
						<form id="modal-email-form" name="email-form" data-name="Email Form">
							<input type="text" class="form-field w-input" maxlength="40" name="Name" data-name="Name" placeholder="Name" id="modal-name" required="">
							<input type="email" class="form-field w-input" maxlength="50" name="Email" data-name="Email" placeholder="Email Address" id="modal-email" required="">
							<input type="submit" value="Sign Me Up" data-wait="Please wait..." class="main-button w-button">
						</form>
						<div class="success-message w-form-done">
							<div>Thank you! Your submission has been received!</div>
						</div>
						<div class="error-message w-form-fail">
							<div>Sorry, didn't work please try again!</div>
						</div>
					</div>
        </div>
      </div>
		</div>`;
	$(document.body).append(modalBody);
}

/**
 * Handle video playback
 */
function handleVideoPlaybackCheck() {
	$('.video-js').each(function (_, item) {
		videojs(item.id).ready(function () {
			this.on('timeupdate', function () {
				var currentVideo = this;
				var currentTime = currentVideo.currentTime();
				if (currentTime > 5 && !item.shownPop && !getStorageItem(storageKeys.email)) {
					setTimeout(() => {
						currentVideo.pause();
					}, 300);
					item.shownPop = true;
					checkSignUp(true);
				}
			})
		});
	});
}

/**
 * ========================= Podcast Module File ==================================
 */

/**
 * Handles podcast submit module
 */
function submitPodcastModule() {
	var container = podcastForm.parent();
	var doneBlock = $('.w-form-done', container);
	var failBlock = $('.w-form-fail', container);

	var action = podcastForm.attr('action');
	var method = podcastForm.attr('method');
	podcastForm.find('#email').val(getStorageItem(storageKeys.email));
	podcastForm.find('#firstName').val(getStorageItem(storageKeys.firstName));
	// TODO: add actual link to podcast
	podcastForm.find('#docLink').val('https://mobb.webflow.io/podcast-episodes/how-to-defeat-a-negative-mindset-and-why-you-were-born-to-win');
	var data = podcastForm.serialize();

	// call via ajax
	$.ajax({
		type: method,
		url: action,
		data: data,
		success: function (resultData) {
			if (!resultData) {
				// show error (fail) block
				podcastForm.show();
				doneBlock.hide();
				failBlock.show();
				console.log(e);
				return;
			}
			// show success (done) block
			podcastForm.hide();
			doneBlock.show();
			failBlock.hide();
		},

		error: function (e) {
			// show error (fail) block
			podcastForm.show();
			doneBlock.hide();
			failBlock.show();
			console.log(e);
		}
	});

	// prevent default web flow action
	return false;
}

/**
 * Run the checks and add listeners when the app is ready
 */
$(document).ready(function () {
	// Other code that needs to be executed on app ready
	createModalInBody();
	checkQueryParams();
	setTimeout(() => {
		checkSignUp();
	}, 2000);
	podcastForm = $(moduleFormSelector);

	// Add listeners here
	$(document).on('click', '.mobb-modal-toggle', hideModal);
	$(document).on('click', 'a', checkRedirection);
	// $(document).on('submit', formSelector, signupUser);
	$(formSelector).submit(signupUser);
	podcastForm.submit(submitPodcastModule);
	handleVideoPlaybackCheck();
});

// http://cdn.jsdelivr.net/gh/garrethdev/mobb.webflow.custom@6e186f3ac8f03b1363edc7587b7fb6ff16d9e14f/mobb.js
// http://cdn.jsdelivr.net/gh/garrethdev/mobb.webflow.custom@6e186f3ac8f03b1363edc7587b7fb6ff16d9e14f/mobb.css

// https://raw.githubusercontent.com/garrethdev/mobb.webflow.custom/6e186f3ac8f03b1363edc7587b7fb6ff16d9e14f/mobb.js
// https://raw.githubusercontent.com/garrethdev/mobb.webflow.custom/6e186f3ac8f03b1363edc7587b7fb6ff16d9e14f/mobb.css
