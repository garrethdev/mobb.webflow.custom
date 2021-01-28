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
 * Handle change event of the checkbox
 * @param {ChangeEvent} event
 */
function handleModalSignInChange(event) {
	var isChecked = event.currentTarget.checked;
	$(modelSelector + ' .w-form-fail').hide();
	if (isChecked) {
		$('#modal-name').fadeIn();
		$('#modal-name').prop('required', true);
		$('#modal-sign-out').fadeIn();
		$('#modal-sign-in').hide();
	} else {
		$('#modal-name').prop('required', false);
		$('#modal-name').fadeOut();
		$('#modal-sign-in').fadeIn();
		$('#modal-sign-out').hide();
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

function makeCreateUserAPICall(userPayload) {
	$.post(serverUrl + '/users', userPayload).done(function (response) {
		console.log('Posted data to server');
		setStorageItem(storageKeys.email, userPayload.email);
		setStorageItem(storageKeys.firstName, userPayload.firstName);
		hideModal();
		$(modelSelector + ' .w-form-fail').hide();
		handlePodcastFormData();
	}).fail(function (er) {
		$(modelSelector + ' .w-form-fail').show();
		console.error('Error in submitting data to server');
	}).always(function () {
		$(modelSelector + ' input[type="submit"]').prop('disabled', false);
	});
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
	// Disabling the input buttons when the for is submitting.
	$(modelSelector + ' input[type="submit"]').prop('disabled', true);

	// Checking if the user has clicked sign up
	var signUpChecked = $('#modal-accept').is(':checked');
	if (signUpChecked) {
		makeCreateUserAPICall(userPayload);
	} else {
		$.get(serverUrl + '/users', { email: userPayload.email }).done(function (response) {
			if (response.exists) {
				console.log('Checking if user exists in database');
				setStorageItem(storageKeys.email, userPayload.email);
				$(modelSelector + ' .w-form-fail').hide();
				$(modelSelector + ' input[type="submit"]').prop('disabled', false);
				hideModal();
				handlePodcastFormData();
			} else {
				// Show error that the details did not work.
				$(modelSelector + ' .w-form-fail').show();
				$(modelSelector + ' input[type="submit"]').prop('disabled', false);
				console.error('User does not exists');
			}
		}).fail(function (er) {
			$(modelSelector + ' .w-form-fail').show();
			console.error('Error in submitting data to server');
		}).always(function () {
			$(modelSelector + ' input[type="submit"]').prop('disabled', false);
		});
	}
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
							<input type="email" class="form-field w-input" maxlength="50" name="Email" data-name="Email" placeholder="Email Address" id="modal-email" required=""/>
							<input type="text" class="hide-me form-field w-input" maxlength="40" name="Name" data-name="Name" placeholder="Name" id="modal-name" />
							<div class="flex-row align-center checkbox-wrapper"><input type="checkbox" class="form-field w-input" name="Accept" data-name="accept" id="modal-accept" /><label for="modal-accept">I'm not a user, sign me up instead.</label></div>
							<input type="submit" id="modal-sign-in" value="Sign In" data-wait="Please wait..." class="main-button w-button" />
							<input type="submit" id="modal-sign-out" value="Sign Me Up" data-wait="Please wait..." class="hide-me main-button w-button" />
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
						currentVideo.exitFullscreen();
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
 * Tries to set users data on the podcast form when the form exists on the page.
 */
function handlePodcastFormData() {
	if (podcastForm) {
		podcastForm.find('#email').val(getStorageItem(storageKeys.email));
		podcastForm.find('#firstName').val(getStorageItem(storageKeys.firstName));
	}
}

/**
 * Run the checks and add listeners when the app is ready
 */
$(document).ready(function () {
	// Other code that needs to be executed on app ready
	createModalInBody();
	checkQueryParams();
	// NOTE: removed checking of the user's login on load
	// setTimeout(() => {
	// 	checkSignUp();
	// }, 2000);
	podcastForm = $(moduleFormSelector);

	// Add listeners here
	$(document).on('click', '.mobb-modal-toggle', hideModal);
	$(document).on('click', 'a', checkRedirection);
	$(document).on('change', '#modal-accept', handleModalSignInChange);
	// $(document).on('submit', formSelector, signupUser);
	$(formSelector).submit(signupUser);
	handleVideoPlaybackCheck();
	handlePodcastFormData();
});

// http://cdn.jsdelivr.net/gh/garrethdev/mobb.webflow.custom@6e186f3ac8f03b1363edc7587b7fb6ff16d9e14f/mobb.js
// http://cdn.jsdelivr.net/gh/garrethdev/mobb.webflow.custom@6e186f3ac8f03b1363edc7587b7fb6ff16d9e14f/mobb.css

// https://raw.githubusercontent.com/garrethdev/mobb.webflow.custom/6e186f3ac8f03b1363edc7587b7fb6ff16d9e14f/mobb.js
// https://raw.githubusercontent.com/garrethdev/mobb.webflow.custom/6e186f3ac8f03b1363edc7587b7fb6ff16d9e14f/mobb.css
