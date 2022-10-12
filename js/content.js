function waitFor(querySelector) {
    return new Promise(resolve => {
        const select = () => document.querySelector(querySelector);
        const elem = select();
        if (elem) {
            return resolve(elem);
        }
        new MutationObserver((_, observer) => {
            const elem = select();
            if (elem) {
                resolve(elem);
                observer.disconnect();
            }
        }).observe(document.body, {
            childList: true,
            subtree: true
        });
    })
}

function formatTime(seconds) {
    let sec = Math.floor(seconds % 60);
    sec = sec >= 10 ? sec : "0" + sec;
    return `0${Math.floor(seconds / 60)}:${sec}`;
}

function isFirefox() {
    return navigator.userAgent.toLowerCase().includes('firefox');
}

waitFor("#shorts-player > div.html5-video-container > video").then(video => {
    // detect adding of player controls and remove them if necessary
    new MutationObserver(() => {
        const elem = document.querySelector(".player-controls")
        if (elem) {
            elem.remove();
        }
    }).observe(document.body, {
        childList: true,
        subtree: true
    });

    // DOM setup
    const shortsPlusContainer = document.createElement("div");
    shortsPlusContainer.classList.add("shorts-plus-container");
    shortsPlusContainer.innerHTML = `
        <div class="video-controls-container">
            <div class="video-left-controls">
                <button class="video-prev-button video-button">
                    <svg height="100%" width="100%" viewBox="0 0 36 36">
                        <path d="m 12,12 h 2 v 12 h -2 z m 3.5,6 8.5,6 V 12 z"/>
                    </svg>
                </button>
                <button class="video-play-button video-button">
                    <svg height="100%" width="100%" viewBox="0 0 36 36">
                        <path/>
                    </svg>
                </button>
                <button class="video-next-button video-button">
                    <svg height="100%" width="100%" viewBox="0 0 36 36">
                        <path d="M 12,24 20.5,18 12,12 V 24 z M 22,12 v 12 h 2 V 12 h -2 z"/>
                    </svg>
                </button>
                <div class="video-volume-container">
                    <button class="video-mute-button video-button">
                        <svg height="100%" width="100%" viewBox="0 0 36 36">
                            <path/>
                        </svg>  
                    </button>
                </div>
                <div class="video-duration-container">
                    <span class="video-duration-current">0:00</span>
                    <span>/</span>
                    <span class="video-duration-total">0:00</span>
                </div>
            </div>
            <div class="video-right-controls">
                <button class="video-speed-button video-button">
                    1x
                </button>
                <button class="video-pip-button video-button">
                    <svg height="100%" width="100%" viewBox="0 0 36 36">
                        <path d="M25,17 L17,17 L17,23 L25,23 L25,17 L25,17 Z M29,25 L29,10.98 C29,9.88 28.1,9 27,9 L9,9 C7.9,9 7,9.88 7,10.98 L7,25 C7,26.1 7.9,27 9,27 L27,27 C28.1,27 29,26.1 29,25 L29,25 Z M27,25.02 L9,25.02 L9,10.97 L27,10.97 L27,25.02 L27,25.02 Z"/>
                    </svg>  
                </button>
            </div>
        </div>
        <div class="video-progress-container">
            <div class="video-progress">
                <div class="video-progress-thumb"/>
            </div>
        </div>
    `;

    const prevButton = shortsPlusContainer.querySelector(".video-prev-button");
    const playButton = shortsPlusContainer.querySelector(".video-play-button");
    const nextButton = shortsPlusContainer.querySelector(".video-next-button");
    const muteButton = shortsPlusContainer.querySelector(".video-mute-button");
    const durationCurrent = shortsPlusContainer.querySelector(".video-duration-current");
    const durationTotal = shortsPlusContainer.querySelector(".video-duration-total");
    const speedButton = shortsPlusContainer.querySelector(".video-speed-button");
    const pipButton = shortsPlusContainer.querySelector(".video-pip-button");
    const progressContainer = shortsPlusContainer.querySelector(".video-progress-container");

    if (isFirefox()) {
        pipButton.style.display="none";
    } else {
        video.disablePictureInPicture = true;
    }

    video.insertAdjacentElement("afterend", shortsPlusContainer);

    let isMoving = false;
    let currentlyMuted = false;
    let pausedWhileMoving = false;
    let currentPlaybackRate = 1;

    shortsPlusContainer.addEventListener("click", evt => evt.stopPropagation());

    video.addEventListener("loadeddata", () => {
        durationTotal.textContent = formatTime(video.duration);
        video.muted = currentlyMuted;
        video.playbackRate = currentPlaybackRate;
    });
    video.addEventListener("timeupdate", () => {
        durationCurrent.textContent = formatTime(video.currentTime);
        progressContainer.style.setProperty("--position", video.currentTime / video.duration);
    });
    video.addEventListener("play", () => {
       shortsPlusContainer.classList.remove("paused");
       playButton.classList.remove("paused");
    });
    video.addEventListener("pause", () => {
       shortsPlusContainer.classList.add("paused");
        playButton.classList.add("paused");
    });
    video.addEventListener('enterpictureinpicture', () => shortsPlusContainer.classList.add("stop"));
    video.addEventListener('leavepictureinpicture', () => {
        video.disablePictureInPicture = true;
        shortsPlusContainer.classList.remove("stop");
    });
    video.addEventListener('volumechange', () => currentlyMuted = video.muted);

    prevButton.addEventListener('click',
        () => document.querySelector(".navigation-container > #navigation-button-up button").click());

    playButton.addEventListener('click', () => video[video.paused ? 'play' : 'pause']());

    nextButton.addEventListener('click',
        () => document.querySelector(".navigation-container > #navigation-button-down button").click());

    muteButton.addEventListener('click', () => {
        video.muted = !video.muted;
        muteButton.classList.toggle("muted", video.muted);
    });

    speedButton.addEventListener('click', () => {
        let nextRate = (video.playbackRate + 0.25);
        if (nextRate > 2.0) {
            nextRate = 0.25;
        }
        video.playbackRate = nextRate;
        speedButton.textContent = `${nextRate}x`;
        currentPlaybackRate = video.playbackRate;
    });

    pipButton.addEventListener('click', () => {
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture();
        } else {
            video.disablePictureInPicture = false;
            video.requestPictureInPicture();
        }
    });

    const updateTimeline = evt => {
        const clientRect = progressContainer.getBoundingClientRect();
        const p = Math.min(Math.max(0, evt.x - clientRect.x), clientRect.width) / clientRect.width;
        if (isMoving) {
            evt.stopPropagation();
            evt.preventDefault();
            progressContainer.style.setProperty("--position", p);
            durationCurrent.textContent = formatTime(p * video.duration);
        }
    };

    const handleTimelineMove = evt => {
        const clientRect = progressContainer.getBoundingClientRect();
        const p = Math.min(Math.max(0, evt.x - clientRect.x), clientRect.width) / clientRect.width;
        isMoving = (evt.buttons & 1) === 1;
        shortsPlusContainer.classList.toggle("moving", isMoving);
        video.currentTime = p * video.duration;
        if (isMoving) {
            pausedWhileMoving = video.paused;
            video.pause();
        } else {
            if (!pausedWhileMoving) {
                video.play();
            }
        }
        updateTimeline(evt);
    };

    document.addEventListener("mouseup", evt => {
        if (isMoving) {
            handleTimelineMove(evt);
        }
    });
    document.addEventListener("mousemove", evt => {
        if (isMoving) {
            updateTimeline(evt);
        }
    });
    progressContainer.addEventListener("mousedown", handleTimelineMove);
    progressContainer.addEventListener("mousemove", updateTimeline);
});
