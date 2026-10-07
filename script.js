'use strict';

var ENDPOINT = 'https://script.google.com/macros/s/AKfycbwG7cAkLudJALVoI8gl4DUmYEaZj035BrrqWVKZl-nFvBNJfEB5R_Qu0eq8_rE8WYX6JQ/exec';
var DRAFT_KEY = 'screeno_draft';

/* ── Helpers ── */

function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function getPhotoSrc() {
    var img = document.querySelector('#photoPreview img');
    return img ? img.src : '';
}

/* ── Toggle groups (Yes / No) ── */

function initToggles() {
    document.querySelectorAll('.toggle-group').forEach(function (group) {
        var hidden = document.getElementById(group.id + 'Value');
        group.querySelectorAll('.toggle-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                group.querySelectorAll('.toggle-btn').forEach(function (b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                if (hidden) hidden.value = btn.dataset.value;
            });
        });
    });
}

/* ── Interest rating (1–5) ── */

function initRating() {
    var group  = document.getElementById('interestGroup');
    var hidden = document.getElementById('interestValue');
    if (!group) return;

    group.querySelectorAll('.rating-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var selected = parseInt(btn.dataset.value, 10);
            group.querySelectorAll('.rating-btn').forEach(function (b) {
                b.classList.toggle('active', parseInt(b.dataset.value, 10) <= selected);
            });
            hidden.value = selected;
        });
    });
}

/* ── Photo capture ── */

function initPhoto() {
    var input   = document.getElementById('photo');
    var preview = document.getElementById('photoPreview');
    var label   = document.getElementById('photoLabel');

    input.addEventListener('change', function () {
        var file = input.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
            var img = document.createElement('img');
            img.src = e.target.result;
            img.alt = 'Captured photo';
            preview.innerHTML = '';
            preview.appendChild(img);
            preview.classList.remove('hidden');
            label.textContent = '✅ Photo Captured';
        };
        reader.readAsDataURL(file);
    });
}

/* ── Geolocation (manual button) ── */

function initLocation() {
    var btn     = document.getElementById('getLocation');
    var display = document.getElementById('locationDisplay');
    var latEl   = document.getElementById('latitude');
    var lngEl   = document.getElementById('longitude');

    btn.addEventListener('click', function () {
        if (!navigator.geolocation) {
            showToast('Geolocation not supported on this device', 'error');
            return;
        }
        btn.textContent = '⏳ Getting location…';
        btn.classList.add('loading');
        btn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            function (pos) {
                var lat = pos.coords.latitude.toFixed(6);
                var lng = pos.coords.longitude.toFixed(6);
                latEl.value = lat;
                lngEl.value = lng;
                btn.textContent = '✅ Location Captured';
                btn.classList.remove('loading');
                btn.classList.add('got');
                btn.disabled = false;
                display.textContent = 'Lat: ' + lat + '   Lng: ' + lng;
                display.classList.remove('hidden');
            },
            function (err) {
                var msg = 'Unable to get location';
                if (err.code === 1) msg = 'Location permission denied';
                if (err.code === 3) msg = 'Location request timed out';
                btn.textContent = '\u{1F4CD} Get Current Location';
                btn.classList.remove('loading');
                btn.disabled = false;
                showToast(msg, 'error');
            },
            { enableHighAccuracy: true, timeout: 12000 }
        );
    });
}

/* ── GPS: returns a Promise resolving to { lat, lng } ── */

function getCoords() {
    var existingLat = val('latitude');
    var existingLng = val('longitude');

    if (existingLat && existingLng) {
        return Promise.resolve({ lat: existingLat, lng: existingLng });
    }

    return new Promise(function (resolve) {
        if (!navigator.geolocation) {
            resolve({ lat: '', lng: '' });
            return;
        }
        navigator.geolocation.getCurrentPosition(
            function (pos) {
                var lat = pos.coords.latitude.toFixed(6);
                var lng = pos.coords.longitude.toFixed(6);
                document.getElementById('latitude').value  = lat;
                document.getElementById('longitude').value = lng;
                var display = document.getElementById('locationDisplay');
                display.textContent = 'Lat: ' + lat + '   Lng: ' + lng;
                display.classList.remove('hidden');
                var btn = document.getElementById('getLocation');
                btn.textContent = '✅ Location Captured';
                btn.classList.remove('loading');
                btn.classList.add('got');
                resolve({ lat: lat, lng: lng });
            },
            function () {
                resolve({ lat: '', lng: '' });
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

/* ── Collect all form fields ── */

function collectFields() {
    return {
        businessName:    val('businessName'),
        category:        val('category'),
        ownerName:       val('ownerName'),
        phone:           val('phone'),
        tvPresent:       val('tvPresentValue'),
        androidTv:       val('androidTvValue'),
        tvVisible:       val('tvVisibleValue'),
        currentContent:  val('currentContent'),
        menuType:        val('menuType'),
        customerTraffic: val('customerTraffic'),
        interest:        val('interestValue'),
        painPoint:       val('painPoint'),
        notes:           val('notes'),
        followUpDate:    val('followUpDate'),
        latitude:        val('latitude'),
        longitude:       val('longitude'),
        photo:           getPhotoSrc()
    };
}

/* ── Save Draft ── */

function saveDraft() {
    var draft = collectFields();
    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        showToast('Draft saved', '');
    } catch (e) {
        showToast('Could not save draft — storage full', 'error');
    }
}

/* ── Load Draft on page open ── */

function loadDraft() {
    var raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;

    var draft;
    try { draft = JSON.parse(raw); } catch (e) { return; }

    var textFields = [
        'businessName', 'category', 'ownerName', 'phone',
        'currentContent', 'menuType', 'customerTraffic',
        'painPoint', 'notes', 'followUpDate'
    ];
    textFields.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && draft[id]) el.value = draft[id];
    });

    restoreToggle('tvPresent',  draft.tvPresent);
    restoreToggle('androidTv',  draft.androidTv);
    restoreToggle('tvVisible',  draft.tvVisible);

    if (draft.interest) {
        var selected = parseInt(draft.interest, 10);
        var group = document.getElementById('interestGroup');
        group.querySelectorAll('.rating-btn').forEach(function (b) {
            b.classList.toggle('active', parseInt(b.dataset.value, 10) <= selected);
        });
        document.getElementById('interestValue').value = draft.interest;
    }

    if (draft.latitude && draft.longitude) {
        document.getElementById('latitude').value  = draft.latitude;
        document.getElementById('longitude').value = draft.longitude;
        var locBtn = document.getElementById('getLocation');
        locBtn.textContent = '✅ Location Captured';
        locBtn.classList.add('got');
        var display = document.getElementById('locationDisplay');
        display.textContent = 'Lat: ' + draft.latitude + '   Lng: ' + draft.longitude;
        display.classList.remove('hidden');
    }

    if (draft.photo) {
        var img = document.createElement('img');
        img.src = draft.photo;
        img.alt = 'Captured photo';
        var preview = document.getElementById('photoPreview');
        preview.innerHTML = '';
        preview.appendChild(img);
        preview.classList.remove('hidden');
        document.getElementById('photoLabel').textContent = '✅ Photo Captured';
    }

    document.getElementById('draftBanner').classList.remove('hidden');
}

function restoreToggle(groupId, value) {
    if (!value) return;
    var group  = document.getElementById(groupId);
    var hidden = document.getElementById(groupId + 'Value');
    if (!group) return;
    group.querySelectorAll('.toggle-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.value === value);
    });
    if (hidden) hidden.value = value;
}

/* ── Submit to Google Apps Script ── */

function submitLead() {
    var nameInput = document.getElementById('businessName');
    if (!nameInput.value.trim()) {
        nameInput.classList.add('invalid');
        nameInput.focus();
        showToast('Business name is required', 'error');
        return;
    }

    var submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    getCoords().then(function (coords) {
        var lat = coords.lat;
        var lng = coords.lng;
        var googleMaps = (lat && lng)
            ? 'https://www.google.com/maps?q=' + lat + ',' + lng
            : '';

        var payload = {
            businessName:    val('businessName'),
            category:        val('category'),
            ownerName:       val('ownerName'),
            phone:           val('phone'),
            latitude:        lat,
            longitude:       lng,
            googleMaps:      googleMaps,
            tvPresent:       val('tvPresentValue'),
            androidTv:       val('androidTvValue'),
            tvVisible:       val('tvVisibleValue'),
            currentContent:  val('currentContent'),
            menuType:        val('menuType'),
            customerTraffic: val('customerTraffic'),
            interest:        val('interestValue'),
            painPoint:       val('painPoint'),
            notes:           val('notes'),
            followUpDate:    val('followUpDate'),
            timestamp:       new Date().toISOString(),
            photoUrl:        ''
        };

        /* Send as text/plain to avoid CORS preflight with Google Apps Script */
        return fetch(ENDPOINT, {
            method:  'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body:    JSON.stringify(payload)
        });

    }).then(function (res) {
        return res.text();

    }).then(function (text) {
        var data = {};
        try { data = JSON.parse(text); } catch (e) { /* non-JSON response is fine */ }

        if (data.result === 'error') {
            throw new Error(data.message || 'Server returned an error');
        }

        /* Success */
        localStorage.removeItem(DRAFT_KEY);
        document.getElementById('draftBanner').classList.add('hidden');
        showToast('✅ Lead submitted!', 'success');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
        setTimeout(resetForm, 1500);

    }).catch(function (err) {
        showToast('Submission failed — draft kept', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
    });
}

/* ── Reset ── */

function resetForm() {
    document.getElementById('leadForm').reset();

    document.querySelectorAll('.toggle-btn').forEach(function (b) { b.classList.remove('active'); });
    ['tvPresentValue', 'androidTvValue', 'tvVisibleValue'].forEach(function (id) {
        document.getElementById(id).value = '';
    });

    document.querySelectorAll('.rating-btn').forEach(function (b) { b.classList.remove('active'); });
    document.getElementById('interestValue').value = '';

    var preview = document.getElementById('photoPreview');
    preview.innerHTML = '';
    preview.classList.add('hidden');
    document.getElementById('photoLabel').textContent = '\u{1F4F7} Take Photo';

    var locBtn = document.getElementById('getLocation');
    locBtn.textContent = '\u{1F4CD} Get Current Location';
    locBtn.classList.remove('got', 'loading');
    locBtn.disabled = false;
    var locDisplay = document.getElementById('locationDisplay');
    locDisplay.textContent = '';
    locDisplay.classList.add('hidden');

    document.getElementById('draftBanner').classList.add('hidden');

    window.scrollTo({ top: 0 });
}

/* ── Toast ── */

var toastTimer = null;

function showToast(msg, type) {
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast ' + (type || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.add('hidden'); }, 2800);
}

/* ── Boot ── */

document.addEventListener('DOMContentLoaded', function () {
    initToggles();
    initRating();
    initPhoto();
    initLocation();

    document.getElementById('businessName').addEventListener('input', function () {
        this.classList.remove('invalid');
    });

    document.getElementById('saveDraftBtn').addEventListener('click', saveDraft);
    document.getElementById('submitBtn').addEventListener('click', submitLead);

    loadDraft();
});
