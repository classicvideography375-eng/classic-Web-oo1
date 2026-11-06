const STORAGE_KEYS = {
  reviews: 'still-motion-reviews',
  theme: 'classic-studios-accent-v2',
  serviceEngagement: 'classic-studios-service-engagement'
};

const initialReviews = [
  { name: 'Sophie & James', service: 'Weddings', rating: 5, message: 'They somehow made a day that already felt magical look and feel even more like us.' },
  { name: 'Amara', service: 'Portraits', rating: 5, message: 'I forgot the camera was there. The photos feel like me on my very best day.' },
  { name: 'Leo, Fieldwork Co.', service: 'Brand films', rating: 5, message: 'They listened first, found the heart of our story, and made something we are proud to share.' }
];

const bookingForm = document.getElementById('bookingForm');
const classEnrollmentForm = document.getElementById('classEnrollmentForm');
const reviewForm = document.getElementById('reviewForm');
const reviewList = document.getElementById('reviewList');
const bookingDate = document.getElementById('bookingDate');
const bookingStatus = document.getElementById('bookingStatus');
const reviewStatus = document.getElementById('reviewStatus');
const ownerInboxDialog = document.getElementById('ownerInboxDialog');
const ownerLoginForm = document.getElementById('ownerLoginForm');
const ownerLoginStatus = document.getElementById('ownerLoginStatus');
const ownerFeedback = document.getElementById('ownerFeedback');
const ownerSetupStatus = document.getElementById('ownerSetupStatus');
const supabaseConfig = window.SUPABASE_CONFIG;
const supabaseClient = window.supabase?.createClient
  && supabaseConfig?.url
  && supabaseConfig?.publishableKey
  ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.publishableKey)
  : null;

function readStoredItems(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error('Stored data is not a list.');
    return parsed;
  } catch (error) {
    console.error(`Unable to read ${key} from browser storage.`, error);
    return fallback;
  }
}

function saveStoredItems(key, items, statusElement) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
    statusElement.textContent = '';
    statusElement.classList.remove('is-error');
    return true;
  } catch (error) {
    console.error(`Unable to save ${key} to browser storage.`, error);
    statusElement.textContent = 'Your browser could not save this. Please check your storage settings and try again.';
    statusElement.classList.add('is-error');
    return false;
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function renderReviews(reviews) {
  reviewList.innerHTML = reviews.map(review => {
    const rating = Number(review.rating);
    const stars = '★'.repeat(Math.max(0, Math.min(5, rating))) + '☆'.repeat(5 - Math.max(0, Math.min(5, rating)));
    return `
      <article class="review-card">
        <span class="rating-stars" aria-label="${rating} out of 5 stars">${stars}</span>
        <blockquote>“${escapeHTML(review.message)}”</blockquote>
        <div class="review-author"><span>${escapeHTML(review.name)}</span><span>${escapeHTML(review.service)}</span></div>
      </article>`;
  }).join('');

  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length
    : 0;
  document.getElementById('averageRating').textContent = average.toFixed(1);
  document.getElementById('reviewCount').textContent = reviews.length;
}

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle('is-error', isError);
}

function showSupabaseSetupError(element) {
  const message = !supabaseConfig?.url || !supabaseConfig?.publishableKey
    ? 'The studio’s secure inbox is not set up yet. Please contact the studio directly for now.'
    : 'The secure feedback service is unavailable. Please try again later or contact the studio.';
  setStatus(element, message, true);
}

async function submitInboxRecord(table, record, form, statusElement, successMessage) {
  const submitButton = form.querySelector('[type="submit"]');
  if (!supabaseClient) {
    showSupabaseSetupError(statusElement);
    return;
  }

  submitButton.disabled = true;
  setStatus(statusElement, 'Sending securely to the studio…');
  try {
    const { error } = await supabaseClient.from(table).insert(record);
    if (error) {
      console.error(`Unable to submit ${table.replaceAll('_', ' ')}.`, error);
      setStatus(statusElement, 'We could not send this to the studio. Please try again or contact them directly.', true);
      return;
    }

    setStatus(statusElement, successMessage);
    form.reset();
  } catch (error) {
    console.error(`Unable to submit ${table.replaceAll('_', ' ')}.`, error);
    setStatus(statusElement, 'We could not send this to the studio. Please try again or contact them directly.', true);
  } finally {
    submitButton.disabled = false;
  }
}

async function submitPrivateFeedback(review) {
  if (!supabaseClient) {
    showSupabaseSetupError(reviewStatus);
    return false;
  }

  try {
    const { error } = await supabaseClient
      .from('private_feedback')
      .insert({
        name: review.name,
        service: review.service,
        rating: review.rating,
        message: review.message
      });
    if (error) {
      console.error('Unable to submit private feedback.', error);
      setStatus(reviewStatus, 'Your private review could not be submitted. Please try again or email the studio.', true);
      return false;
    }

    setStatus(reviewStatus, 'Thank you for your feedback. It was sent privately to the studio and will not appear publicly.');
    reviewForm.reset();
    return true;
  } catch (error) {
    console.error('Unable to submit private feedback.', error);
    setStatus(reviewStatus, 'Your private review could not be submitted. Please try again or email the studio.', true);
    return false;
  }
}

function renderPrivateFeedback(items) {
  const list = document.getElementById('ownerFeedbackList');
  list.replaceChildren();

  if (!items.length) {
    const empty = document.createElement('li');
    empty.className = 'owner-feedback-empty';
    empty.textContent = 'No private reviews yet.';
    list.append(empty);
    return;
  }

  items.forEach(item => {
    const entry = document.createElement('li');
    const heading = document.createElement('div');
    heading.className = 'owner-feedback-meta';
    const rating = document.createElement('strong');
    rating.textContent = `${item.rating} / 5 stars`;
    const service = document.createElement('span');
    service.textContent = item.service;
    const time = document.createElement('time');
    time.dateTime = item.created_at;
    time.textContent = new Date(item.created_at).toLocaleString();
    heading.append(rating, service, time);

    const name = document.createElement('p');
    name.className = 'owner-feedback-name';
    name.textContent = item.name;
    const message = document.createElement('blockquote');
    message.textContent = item.message;
    entry.append(heading, name, message);
    list.append(entry);
  });
}

function renderOwnerRequests(items, list, kind) {
  list.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('li');
    empty.className = 'owner-feedback-empty';
    empty.textContent = `No ${kind} yet.`;
    list.append(empty);
    return;
  }

  items.forEach(item => {
    const entry = document.createElement('li');
    const heading = document.createElement('div');
    heading.className = 'owner-feedback-meta';
    const service = document.createElement('strong');
    service.textContent = kind === 'booking enquiries' ? item.service : item.class_interest;
    const experience = kind === 'class registrations' ? document.createElement('span') : null;
    if (experience) experience.textContent = item.experience;
    const time = document.createElement('time');
    time.dateTime = item.created_at;
    time.textContent = new Date(item.created_at).toLocaleString();
    heading.append(service);
    if (experience) heading.append(experience);
    heading.append(time);

    const name = document.createElement('p');
    name.className = 'owner-feedback-name';
    name.textContent = item.name;
    const email = document.createElement('a');
    email.className = 'owner-request-email';
    email.href = `mailto:${item.email}`;
    email.textContent = item.email;
    entry.append(heading, name, email);

    if (kind === 'booking enquiries') {
      const date = document.createElement('p');
      date.className = 'owner-request-detail';
      date.textContent = item.requested_date
        ? `Preferred date: ${new Date(`${item.requested_date}T00:00:00`).toLocaleDateString()}`
        : 'No preferred date provided.';
      entry.append(date);
      if (item.message) {
        const message = document.createElement('blockquote');
        message.textContent = item.message;
        entry.append(message);
      }
    }

    list.append(entry);
  });
}

async function loadOwnerInbox() {
  const reviewStatusElement = document.getElementById('ownerFeedbackStatus');
  const bookingsStatus = document.getElementById('ownerBookingsStatus');
  const classesStatus = document.getElementById('ownerClassesStatus');
  const reviewListElement = document.getElementById('ownerFeedbackList');
  const bookingsList = document.getElementById('ownerBookingsList');
  const classesList = document.getElementById('ownerClassesList');
  setStatus(reviewStatusElement, 'Loading private inbox…');
  setStatus(bookingsStatus, 'Loading booking enquiries…');
  setStatus(classesStatus, 'Loading class registrations…');

  try {
    const { data: owner, error: ownerError } = await supabaseClient
      .from('private_feedback_owners')
      .select('owner_id')
      .maybeSingle();
    if (ownerError || !owner) {
      if (ownerError) console.error('Unable to verify private inbox owner access.', ownerError);
      setStatus(reviewStatusElement, 'This account is not registered as the inbox owner.', true);
      setStatus(bookingsStatus, '');
      setStatus(classesStatus, '');
      return;
    }

    const results = await Promise.all([
      supabaseClient.from('private_feedback')
        .select('id, name, service, rating, message, created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      supabaseClient.from('booking_requests')
        .select('id, name, email, service, requested_date, message, created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      supabaseClient.from('class_enrollments')
        .select('id, name, email, class_interest, experience, created_at')
        .order('created_at', { ascending: false })
        .limit(100)
    ]);

    const [reviews, bookings, classes] = results;
    if (reviews.error) {
      console.error('Unable to load private feedback.', reviews.error);
      setStatus(reviewStatusElement, 'Could not load private reviews.', true);
    } else {
      renderPrivateFeedback(reviews.data);
      setStatus(reviewStatusElement, reviews.data.length === 100 ? 'Showing the 100 most recent reviews.' : '');
    }
    if (bookings.error) {
      console.error('Unable to load booking enquiries.', bookings.error);
      setStatus(bookingsStatus, 'Could not load booking enquiries.', true);
    } else {
      renderOwnerRequests(bookings.data, bookingsList, 'booking enquiries');
      setStatus(bookingsStatus, bookings.data.length === 100 ? 'Showing the 100 most recent enquiries.' : '');
    }
    if (classes.error) {
      console.error('Unable to load class registrations.', classes.error);
      setStatus(classesStatus, 'Could not load class registrations.', true);
    } else {
      renderOwnerRequests(classes.data, classesList, 'class registrations');
      setStatus(classesStatus, classes.data.length === 100 ? 'Showing the 100 most recent registrations.' : '');
    }
  } catch (error) {
    console.error('Unable to load the owner inbox.', error);
    setStatus(reviewStatusElement, 'Could not load the inbox. Please try again.', true);
  }
}

async function openOwnerInbox() {
  ownerInboxDialog.showModal();
  ownerLoginForm.hidden = true;
  ownerFeedback.hidden = true;
  setStatus(ownerSetupStatus, '');
  setStatus(ownerLoginStatus, '');

  if (!supabaseClient) {
    showSupabaseSetupError(ownerSetupStatus);
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (data.session) {
      ownerFeedback.hidden = false;
      await loadOwnerInbox();
    } else {
      ownerLoginForm.hidden = false;
    }
  } catch (error) {
    console.error('Unable to check owner authentication.', error);
    setStatus(ownerSetupStatus, 'Could not verify your sign-in. Please try again.', true);
    ownerLoginForm.hidden = false;
  }
}

const serviceCards = [...document.querySelectorAll('.service-card[data-service]')];
const serviceGrid = document.querySelector('.service-grid');

function readServiceEngagement() {
  const emptyEngagement = Object.fromEntries(serviceCards.map(card => [
    card.dataset.service,
    { liked: false, comments: [] }
  ]));

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.serviceEngagement);
    if (stored === null) return emptyEngagement;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Stored service engagement is not an object.');
    }

    return Object.fromEntries(serviceCards.map(card => {
      const saved = parsed[card.dataset.service];
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
        return [card.dataset.service, emptyEngagement[card.dataset.service]];
      }

      const comments = Array.isArray(saved.comments)
        ? saved.comments.filter(comment => comment && typeof comment.name === 'string' && typeof comment.message === 'string')
        : [];
      return [card.dataset.service, { liked: saved.liked === true, comments }];
    }));
  } catch (error) {
    console.error('Unable to read service engagement from browser storage.', error);
    return emptyEngagement;
  }
}

let serviceEngagement = readServiceEngagement();

function saveServiceEngagement(nextEngagement, statusElement) {
  try {
    localStorage.setItem(STORAGE_KEYS.serviceEngagement, JSON.stringify(nextEngagement));
    statusElement.textContent = '';
    statusElement.classList.remove('is-error');
    return true;
  } catch (error) {
    console.error('Unable to save service engagement in browser storage.', error);
    statusElement.textContent = 'Your browser could not save this. Please check your storage settings and try again.';
    statusElement.classList.add('is-error');
    return false;
  }
}

function renderServiceEngagement() {
  serviceCards.forEach(card => {
    const service = card.dataset.service;
    const engagement = serviceEngagement[service];
    const likeButton = card.querySelector('.service-like');
    likeButton.setAttribute('aria-pressed', String(engagement.liked));
    likeButton.setAttribute('aria-label', `${engagement.liked ? 'Unlike' : 'Like'} ${service}`);
    likeButton.querySelector('.like-icon').textContent = engagement.liked ? '♥' : '♡';
    likeButton.querySelector('.like-label').textContent = engagement.liked ? 'Liked' : 'Like';
    likeButton.querySelector('.like-count').textContent = engagement.liked ? '1' : '0';

    const commentList = card.querySelector('.service-comment-list');
    commentList.replaceChildren(...engagement.comments.map(comment => {
      const item = document.createElement('li');
      const author = document.createElement('strong');
      author.textContent = comment.name;
      item.append(author, document.createTextNode(comment.message));
      return item;
    }));
  });
}

serviceGrid.addEventListener('click', event => {
  const card = event.target.closest('.service-card[data-service]');
  if (!card) return;

  const service = card.dataset.service;
  const likeButton = event.target.closest('.service-like');
  if (likeButton) {
    const nextEngagement = {
      ...serviceEngagement,
      [service]: { ...serviceEngagement[service], liked: !serviceEngagement[service].liked }
    };
    if (saveServiceEngagement(nextEngagement, card.querySelector('.service-comment-status'))) {
      serviceEngagement = nextEngagement;
      renderServiceEngagement();
    }
    return;
  }

  const commentToggle = event.target.closest('.service-comment-toggle');
  if (commentToggle) {
    const comments = card.querySelector('.service-comments');
    const isExpanded = commentToggle.getAttribute('aria-expanded') === 'true';
    commentToggle.setAttribute('aria-expanded', String(!isExpanded));
    commentToggle.textContent = isExpanded ? 'Leave a comment' : 'Hide comments';
    comments.hidden = isExpanded;
  }
});

serviceGrid.addEventListener('submit', event => {
  const form = event.target.closest('.service-comment-form');
  if (!form) return;
  event.preventDefault();

  const card = form.closest('.service-card');
  const status = form.querySelector('.service-comment-status');
  const formData = new FormData(form);
  const message = formData.get('comment').trim();
  if (!message) {
    setStatus(status, 'Please enter a comment before posting.', true);
    return;
  }

  const service = card.dataset.service;
  const comment = {
    name: formData.get('name').trim() || 'Guest',
    message
  };
  const nextEngagement = {
    ...serviceEngagement,
    [service]: {
      ...serviceEngagement[service],
      comments: [...serviceEngagement[service].comments, comment]
    }
  };
  if (!saveServiceEngagement(nextEngagement, status)) return;

  serviceEngagement = nextEngagement;
  renderServiceEngagement();
  setStatus(status, 'Your comment has been saved in this browser.');
  form.reset();
});

renderServiceEngagement();

const themeCustomizer = document.getElementById('themeCustomizer');
const themeStatus = document.getElementById('themeStatus');
const customAccentColor = document.getElementById('customAccentColor');
const themeToggle = document.querySelector('.theme-toggle');
const socialDialog = document.getElementById('socialDialog');
const socialToggle = document.querySelector('.social-toggle');
const themePresets = [...document.querySelectorAll('[data-theme-color]')];
const colorGameDialog = document.getElementById('colorGameDialog');
const poseInspoDialog = document.getElementById('poseInspoDialog');
const colorGamePalette = [
  '#ffc400', '#91a88b', '#d48b80', '#7294a8',
  '#bd9acb', '#d0b96f', '#b8785a', '#79aaa0',
  '#e1c6a8', '#7889b5', '#c4a0a0', '#9caa70'
];
let colorGameRound = 0;
let colorGameScore = 0;
let colorGameRounds = [];
let colorGameAnswered = false;

function applyAccentColor(color, save = true) {
  if (!/^#[\da-f]{6}$/i.test(color)) return;

  const channels = [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16) / 255);
  const luminance = channels
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);

  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-contrast', luminance > 0.42 ? '#171300' : '#f5f0e5');
  customAccentColor.value = color;
  themePresets.forEach(preset => {
    preset.setAttribute('aria-pressed', String(preset.dataset.themeColor.toLowerCase() === color.toLowerCase()));
  });

  if (!save) return;
  try {
    localStorage.setItem(STORAGE_KEYS.theme, color);
    themeStatus.textContent = 'Color preference saved on this device.';
  } catch (error) {
    console.error('Unable to save the color preference in browser storage.', error);
    themeStatus.textContent = 'Your color is applied for this visit, but could not be saved.';
  }
}

try {
  const savedAccent = localStorage.getItem(STORAGE_KEYS.theme);
  const previousAccent = savedAccent ? null : localStorage.getItem('classic-studios-accent');
  const migratedAccent = previousAccent?.toLowerCase() === '#d9a36b' ? '#ffc400' : previousAccent;
  const accent = savedAccent || migratedAccent;
  if (accent && /^#[\da-f]{6}$/i.test(accent)) applyAccentColor(accent, !savedAccent);
} catch (error) {
  console.error('Unable to read the saved color preference from browser storage.', error);
}

themeToggle.addEventListener('click', () => themeCustomizer.showModal());
socialToggle.addEventListener('click', () => socialDialog.showModal());
function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function finishColorGame() {
  document.getElementById('colorGameProgress').textContent = `Final score: ${colorGameScore} / 5`;
  document.getElementById('colorTarget').hidden = true;
  document.getElementById('colorChoices').hidden = true;
  document.getElementById('colorGameStatus').textContent = colorGameScore === 5
    ? 'Perfect match! You have a brilliant eye for color.'
    : colorGameScore >= 3
      ? 'Lovely eye! Ready to try for an even higher score?'
      : 'Good start! Play again and see if you can beat your score.';
  document.getElementById('colorGameNext').hidden = true;
  document.getElementById('colorGameRestart').hidden = false;
  document.getElementById('colorGameRestart').focus();
}

function renderColorGameRound() {
  const progress = document.getElementById('colorGameProgress');
  const target = document.getElementById('colorTarget');
  const choices = document.getElementById('colorChoices');
  const status = document.getElementById('colorGameStatus');
  const nextButton = document.getElementById('colorGameNext');

  if (colorGameRound >= colorGameRounds.length) {
    finishColorGame();
    return;
  }

  const round = colorGameRounds[colorGameRound];
  progress.textContent = `Round ${colorGameRound + 1} of 5 · Score ${colorGameScore}`;
  target.hidden = false;
  target.style.setProperty('--target-color', round.target);
  choices.hidden = false;
  choices.replaceChildren(...round.options.map((color, index) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'color-choice';
    option.style.setProperty('--choice-color', color);
    option.setAttribute('aria-label', `Color option ${index + 1}`);
    option.dataset.color = color;
    return option;
  }));
  status.textContent = '';
  nextButton.hidden = true;
  nextButton.textContent = colorGameRound === colorGameRounds.length - 1 ? 'See my score' : 'Next round';
  colorGameAnswered = false;
}

function startColorGame() {
  const roundColors = shuffle(colorGamePalette).slice(0, 5);
  colorGameRound = 0;
  colorGameScore = 0;
  colorGameRounds = roundColors.map(targetColor => ({
    target: targetColor,
    options: shuffle([
      targetColor,
      ...shuffle(colorGamePalette.filter(color => color !== targetColor)).slice(0, 3)
    ])
  }));
  document.getElementById('colorGameRestart').hidden = true;
  renderColorGameRound();
}

document.getElementById('openColorGame').addEventListener('click', () => {
  startColorGame();
  colorGameDialog.showModal();
});
document.getElementById('openOwnerInbox').addEventListener('click', openOwnerInbox);
ownerLoginForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!supabaseClient) {
    showSupabaseSetupError(ownerLoginStatus);
    return;
  }

  const formData = new FormData(ownerLoginForm);
  setStatus(ownerLoginStatus, 'Signing in…');
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: formData.get('email').trim(),
      password: formData.get('password')
    });
    if (error) {
      console.error('Owner sign-in failed.', error);
      setStatus(ownerLoginStatus, 'Sign-in failed. Check your credentials and try again.', true);
      return;
    }

    ownerLoginForm.hidden = true;
    ownerFeedback.hidden = false;
    ownerLoginForm.reset();
    await loadOwnerInbox();
  } catch (error) {
    console.error('Owner sign-in failed.', error);
    setStatus(ownerLoginStatus, 'Sign-in is unavailable. Please try again.', true);
  }
});
document.getElementById('ownerSignOut').addEventListener('click', async () => {
  const status = document.getElementById('ownerFeedbackStatus');
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error('Unable to sign out of the private feedback inbox.', error);
      setStatus(status, 'Could not sign out. Please try again.', true);
      return;
    }

    ownerFeedback.hidden = true;
    document.getElementById('ownerFeedbackList').replaceChildren();
    document.getElementById('ownerBookingsList').replaceChildren();
    document.getElementById('ownerClassesList').replaceChildren();
    ownerLoginForm.hidden = false;
    ownerLoginForm.reset();
    setStatus(ownerLoginStatus, 'You have signed out.');
  } catch (error) {
    console.error('Unable to sign out of the private feedback inbox.', error);
    setStatus(status, 'Could not sign out. Please try again.', true);
  }
});
document.getElementById('openPoseInspo').addEventListener('click', () => poseInspoDialog.showModal());
document.getElementById('colorChoices').addEventListener('click', event => {
  const choice = event.target.closest('.color-choice');
  if (!choice || colorGameAnswered) return;

  colorGameAnswered = true;
  const correct = choice.dataset.color === colorGameRounds[colorGameRound].target;
  if (correct) colorGameScore += 1;
  document.querySelectorAll('.color-choice').forEach(option => {
    option.disabled = true;
    if (option.dataset.color === colorGameRounds[colorGameRound].target) option.classList.add('is-correct');
  });
  if (!correct) choice.classList.add('is-incorrect');
  document.getElementById('colorGameProgress').textContent = `Round ${colorGameRound + 1} of 5 · Score ${colorGameScore}`;
  document.getElementById('colorGameStatus').textContent = correct ? 'That’s a match!' : 'Not quite — the outlined swatch was the match.';
  document.getElementById('colorGameNext').hidden = false;
});
document.getElementById('colorGameNext').addEventListener('click', () => {
  colorGameRound += 1;
  renderColorGameRound();
});
document.getElementById('colorGameRestart').addEventListener('click', startColorGame);
themePresets.forEach(preset => {
  preset.setAttribute('aria-pressed', 'false');
  preset.addEventListener('click', () => applyAccentColor(preset.dataset.themeColor));
});
customAccentColor.addEventListener('input', () => applyAccentColor(customAccentColor.value));

bookingDate.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

const savedPublicReviews = readStoredItems(STORAGE_KEYS.reviews, [])
  .filter(review => review && Number(review.rating) >= 4);
const reviews = [...initialReviews, ...savedPublicReviews];
renderReviews(reviews);

document.querySelectorAll('[data-book-service]').forEach(link => {
  link.addEventListener('click', () => {
    document.getElementById('bookingService').value = link.dataset.bookService;
  });
});

bookingForm.addEventListener('submit', async event => {
  event.preventDefault();
  const formData = new FormData(bookingForm);
  const booking = {
    name: formData.get('name').trim(),
    email: formData.get('email').trim(),
    service: formData.get('service'),
    requested_date: formData.get('date') || null,
    message: formData.get('message').trim()
  };
  await submitInboxRecord(
    'booking_requests',
    booking,
    bookingForm,
    bookingStatus,
    `Thanks, ${booking.name}! Your enquiry was sent securely to the studio.`
  );
  bookingDate.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
});

classEnrollmentForm.addEventListener('submit', async event => {
  event.preventDefault();
  const formData = new FormData(classEnrollmentForm);
  const enrollment = {
    name: formData.get('name').trim(),
    email: formData.get('email').trim(),
    class_interest: formData.get('classInterest'),
    experience: formData.get('experience')
  };
  if (!enrollment.name || !enrollment.email) {
    setStatus(document.getElementById('classEnrollmentStatus'), 'Please enter your name and email address.', true);
    return;
  }

  await submitInboxRecord(
    'class_enrollments',
    enrollment,
    classEnrollmentForm,
    document.getElementById('classEnrollmentStatus'),
    `Thanks, ${enrollment.name}! Your interest in ${enrollment.class_interest.toLowerCase()} was sent securely to the studio.`
  );
});

reviewForm.addEventListener('submit', async event => {
  event.preventDefault();
  const formData = new FormData(reviewForm);
  const review = {
    name: formData.get('name').trim(),
    service: formData.get('service'),
    rating: Number(formData.get('rating')),
    message: formData.get('message').trim()
  };
  if (!review.name || !review.message) {
    setStatus(reviewStatus, 'Please enter your name and a review before submitting.', true);
    return;
  }
  if (review.rating <= 3) {
    await submitPrivateFeedback(review);
    return;
  }

  const savedReviews = readStoredItems(STORAGE_KEYS.reviews, []);
  savedReviews.push(review);
  if (!saveStoredItems(STORAGE_KEYS.reviews, savedReviews, reviewStatus)) return;
  reviews.push(review);
  renderReviews(reviews);
  setStatus(reviewStatus, 'Thank you for sharing your experience! Your review is now shown on this browser.');
  reviewForm.reset();
});
