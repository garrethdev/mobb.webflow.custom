// Mobb Constants:
var localStorage = window.localStorage;
var storageKeys = {
  email: 'email',
  firstName: 'firstName',
  videoStartTime: 'videoStartTime',
  videosPlayed: 'videosPlayed',
  redirectLink: 'redirectLink'
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
var joinNowButtonAboutUSPageSelector = 'a.main-button.p-lr-64.w-button';
var bffbFreePreviewFormSelector = '#wf-form-Waitlist-Form-';

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
  var redirectLink = getStorageItem(storageKeys.redirectLink);
  var email = getStorageItem(storageKeys.email);
  if (email && redirectLink) {
    window.location.href = redirectLink;
    removeStorageItem(storageKeys.redirectLink);
  }
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
 * Checks if the url is about page url or not
 * @param {String} url - Url to be checked if it is about page or not
 */
function checkIfUrlIsForAboutPage(url) {
  return url && url.split('/').slice(-1)[0] === 'about';
}

/**
 * ========================= Sign In Checker File ==================================
 */

/**
 * Checks if we need to block the users redirection
 * @param {ClickEvent} event
 */
function checkRedirection(event) {
  var runOnThisPage = /^(\/|\/about)$/.test(window.location.pathname);
  const link = event.currentTarget.href;
  if (runOnThisPage && checkIfUrlIsInternal(link) && !checkIfUrlIsForAboutPage(link)) {
    var loggedIn = checkSignUp();
    if (!loggedIn) {
      setStorageItem(storageKeys.redirectLink, link);
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
 * Validate email address input
 * @param {String} email
 */
function validateEmail(email= '') {
  const regex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regex.test(String(email).toLowerCase());
}

/**
 * check if user exist in DB
 * @param {String} email
 */
function checkEmailExistence(email) {
  return $.get(serverUrl + '/users', { email }).done(function (response) {
    return Promise.resolve({success: true, exists: response.exists});
  }).fail(function (er) {
    return Promise.reject({success: false, error: 'Error in submitting data to server'});
  });
}

/**
 * Handle change event of the email address input
 * @param {ChangeEvent} event
 */
async function handleEmailChange(event) {
  $(modelSelector + ' input[type="submit"]').prop('disabled', true);
  $(modelSelector + ' .w-form-fail').hide();
  var email = event.currentTarget.value;
  if(validateEmail(email)) {
    $(modelSelector + ' .loader').show();
    try {
      var response = await checkEmailExistence(email);
      if(response.exists) {
        $('#modal-name').val('');
        $('#modal-name').prop('required', false);
        $('#modal-name').fadeOut();
        $('.mobb-modal-submit-text').hide();
        $(modelSelector + ' input[type="submit"]').prop('disabled', false);
      } else {
        $('#modal-name').fadeIn();
        $('#modal-name').prop('required', true);
        $(modelSelector + ' .mobb-modal-submit-text').show();
        var firstName = extractFromSelector(formSelector + ' input[name="Name"]');
        if(firstName) {
          $(modelSelector + ' input[type="submit"]').prop('disabled', false);
        } else {
          $(modelSelector + ' input[type="submit"]').prop('disabled', true);
        }
      }
    } catch (e) {
      $(modelSelector + ' .w-form-fail').show();
    } finally {
      $(modelSelector + ' .loader').hide();
    }
  } else {
    $(modelSelector + ' input[type="submit"]').prop('disabled', true);
    $('#modal-name').val('');
    $('#modal-name').prop('required', false);
    $('#modal-name').fadeOut();
    $(modelSelector + ' .mobb-modal-submit-text').hide();
    $(modelSelector + ' .loader').hide();
  }
}

/**
 * Handle change event of the name input
 * @param {ChangeEvent} event
 */
function handleNameChange(event) {
  var name = event.currentTarget.value;
  if(name) {
    $(modelSelector + ' input[type="submit"]').prop('disabled', false);
  } else {
    $(modelSelector + ' input[type="submit"]').prop('disabled', true);
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
  $(modelSelector + ' .loader').show();
  $(modelSelector + ' input[type="submit"]').prop('disabled', true);
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
    $(joinNowButtonAboutUSPageSelector).hide();
    $(modelSelector + ' .loader').hide();
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
      $(joinNowButtonAboutUSPageSelector).hide();
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
 * Get user details from form and update the server with user details
 */
function handleUnlockNow(event) {
  event.preventDefault();
  var email = extractFromSelector(formSelector + ' input[name="Email"]');
  var firstName = extractFromSelector(formSelector + ' input[name="Name"]');
  let payload = { email };
  if(firstName) {
    payload.firstName = firstName;
  }
  makeCreateUserAPICall(payload);
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
    <img src="https://uploads-ssl.webflow.com/5ff632487b0ea55e9da61234/60467e96fe998506adc2d9c0_crown.svg" class="mobb-model-crown" />
    <button class="mobb-modal-close mobb-modal-toggle">
    <img src="https://uploads-ssl.webflow.com/5ff632487b0ea55e9da61234/6076cafb8bde420cda72272d_cancel.svg" />
    </button>
    <div class="mobb-modal-header">
    <h3 class="mobb-modal-heading">Unlimited Access to Everything Black Business.</h3>
  <h5 class="mobb-modal-subtitle">Enter your email to get access to our newsletter, podcast, and the exclusive <b>founder personality quiz.</b></h5>
  </div>
  <div class="mobb-modal-body mobb-dark-bg">
    <div class="mobb-modal-content">
    <form class="w-form" id="modal-email-form" name="email-form" data-name="Email Form">
    <input type="email" class="form-field w-input" pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$" maxlength="50" name="Email" data-name="Email" placeholder="Email Address" id="modal-email" required title="Please provide a valid e-mail address"/>
    <input type="text" class="hide-me form-field w-input" maxlength="40" name="Name" data-name="Name" placeholder="Name" id="modal-name" />
    <div class="mobb-modal-submit-wrapper">
    <input type="submit" id="modal-sign-in" value="Unlock Now" data-wait="Please wait..." class="main-button w-button fullwidth" disabled/>
        <!--<input type="submit" id="modal-sign-out" value="Sign Me Up" data-wait="Please wait..." class="hide-me main-button w-button fullwidth" />-->
    <div class="loader hide-me"></div>
    </div>
    <div class="mobb-modal-submit-text hide-me">By submitting this form, you are subscribing to our newsletter. Unsubscribe anytime.</div>
    </form>
    <div class="success-message w-form-done">
    <div>Welcome to the MOBB community. You now have access to all content and resources.</div>
  </div>
  <div class="error-message w-form-fail">
    <div>Sorry, that email didn't work.</div>
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
 * Hide Join Now button if user is logged in
 */
function toggleJoinNowButtonOnAboutUSPage() {
  var loggedIn = !!getStorageItem(storageKeys.email);;
  if (loggedIn) {
    $(joinNowButtonAboutUSPageSelector).hide();
    return;
  }
  $(joinNowButtonAboutUSPageSelector).show();
}

/**
 * subscribe user on BFFB waiting List.
 * @param {ChangeEvent} event
 */
function handleBFFBPreviewBtn(event) {
  var selector = event.currentTarget.id;
  var email = extractFromSelector('#' + selector + ' input[name="Email"]');

  $.post(serverUrl + '/users/bffb', { email }).done(function (response) {
    console.log('Posted data to server');
  }).fail(function (er) {
    console.error('Error in submitting data to server', er);
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
 * Debounce function
 * @param func
 * @param wait
 * @param immediate
 * @returns {function(...[*]=)}
 */
function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

/**
 * Handle Vimeo Player event
 */
function handleVimeoVideo() {
  var iframe = document.querySelector('iframe');
  var player = new Vimeo.Player(iframe);

  player.on('timeupdate', function(data) {
    if (data.seconds > 5*60) {
      $('#timer').css({ display: 'block' });
    }
  });

  player.on('ended', function() {
    $('#timer').css({ display: 'block' });
  });
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
  $(document).on('keydown paste', '#modal-email', debounce(handleEmailChange, 500));
  $(document).on('keydown paste', '#modal-name', handleNameChange);
  // $(document).on('submit', formSelector, signupUser);
  // $(formSelector).submit(signupUser);
  $(formSelector).submit(handleUnlockNow);
  podcastForm.submit(() => checkSignUp());
  for(var i=0; i<5; i++) {
    var selector = bffbFreePreviewFormSelector + i;
    $(selector).submit(handleBFFBPreviewBtn);
  }

  handleVideoPlaybackCheck();
  handlePodcastFormData();
  // called below function for About page only
  var isAboutPage = /^(\/about(.*))$/.test(window.location.pathname);
  if (isAboutPage) {
    toggleJoinNowButtonOnAboutUSPage();
  }

  // called below function for bffb-m1 page only
  var isModulePage = /^(\/bffb-m1(.*))$/.test(window.location.pathname);
  if (isModulePage) {
    handleVimeoVideo();
  }

});

// http://cdn.jsdelivr.net/gh/garrethdev/mobb.webflow.custom@6e186f3ac8f03b1363edc7587b7fb6ff16d9e14f/mobb.js
// http://cdn.jsdelivr.net/gh/garrethdev/mobb.webflow.custom@6e186f3ac8f03b1363edc7587b7fb6ff16d9e14f/mobb.css

// https://raw.githubusercontent.com/garrethdev/mobb.webflow.custom/6e186f3ac8f03b1363edc7587b7fb6ff16d9e14f/mobb.js
// https://raw.githubusercontent.com/garrethdev/mobb.webflow.custom/6e186f3ac8f03b1363edc7587b7fb6ff16d9e14f/mobb.css
