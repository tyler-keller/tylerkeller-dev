<script>
    // import L from 'leaflet';
    // import 'leaflet/dist/leaflet.css';
    // import { onMount } from 'svelte';

    // let darkMode = false;

    // // Check for system preference on mount
    // onMount(() => {
    //     const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    //     darkMode = prefersDark;
    // });

    // onMount(() => {
    //     const locations = [
    //         [39.7435186, -105.2431095], // golden co
    //         [38.9072, -77.0369], // washington dc
    //         [50.1109, 8.6821], // frankfurt deu
    //         [38.9072, -77.0369], // washington dc
    //         [39.7435186, -105.2431095] // golden co
    //     ];

    //     locations.forEach(([lat, lon], index) => {
    //         L.marker([lat, lon]).addTo(map)
    //             .bindPopup(`Location ${index + 1}`)
    //             .openPopup();

    //     if (index > 0) {
    //             const from = locations[index - 1];
    //             const to = [lat, lon];
    //             L.polyline([from, to], { color: 'red' }).addTo(map);
    //         }
    //     });

    //     const map = L.map('map').setView([38.7447379,-91.4381334], 3.2);
        
    //     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    //     attribution: '© OpenStreetMap contributors'
    //     }).addTo(map);

    //     // Add more code here to plot your journey
    // });

    // Function to toggle dark mode
    // function toggleDarkMode() {
    //     darkMode = !darkMode;
    // }
</script>

<style>
:global(body.dark) {
    background-color: #333;
    color: white;
}
:global(body) {
    transition: background-color 0.3s, color 0.3s;
}
</style>

<div class="mb-4 text-center">
    <img src="https://avatars.githubusercontent.com/u/96822088?s=400&u=df589e2e9891eaeebd69aaf79eb28f50f181ca0b&v=4" alt="Tyler Keller" class="h-32 w-32 mx-auto" />
</div>

<div class="mb-4 text-center space-y-2">
    <h1 class="text-4xl font-bold">Tyler Keller</h1>
    <h3 class="text-xl">Software Engineer</h3>
</div>

<div class="mb-4">
    <ul class="space-y-4">
        <li class="flex justify-center space-x-6">
            <a href="https://github.com/tylerckeller" target="_blank" rel="noopener noreferrer" class="text-blue-500">
                <img src="https://cdn-icons-png.flaticon.com/512/25/25231.png" alt="GitHub" class="h-6 w-6" />
            </a>
            <a href="https://www.linkedin.com/in/tylerkeller-dev/" target="_blank" rel="noopener noreferrer" class="text-blue-500">
                <img src="https://www.edigitalagency.com.au/wp-content/uploads/linkedin-icon-black-png.png" alt="LinkedIn" class="h-6 w-6" />
            </a>
            <a href="https://discordapp.com/users/478985762059321360" target="_blank" rel="noopener noreferrer" class="text-blue-500">
                <img src="https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6918e57475a843f59f_icon_clyde_black_RGB.svg" alt="Discord" class="h-6 w-6" />
            </a>
        </li>
    </ul>
</div>

<div class="mb-4 space-y-2 text-center">
    <h1 class="text-xl font-bold">Contact Information</h1>

    <ul class="space-y-2">
        <li>
            <p class="font-semibold">Email:</p>
            <a class="text-blue-500" href="mailto:tyler.c.keller@gmail.com">tyler.c.keller@gmail.com</a>
        </li>
        <li>
            <p class="font-semibold">Location:</p>
            <p>Golden, CO, USA</p>
        </li>
    </ul>
</div>

<div class="mb-4 space-y-2 text-center" >

    <h5 class="font-semibold text-center text-xl" >What Drives Me</h5>
    <p class="text-center" >
    I love using software to fix everyday problems.
    </p>

    <h5 class="text-center text-xl font-semibold" >The Journey So Far</h5>
    <p class="text-center" >
    TX -> CO -> HI -> CA -> NJ -> VA -> DEU -> VA -> CO
    </p>

    <!-- <div id="map" style="height: 400px;"></div> -->

    <h5 class="text-center text-xl font-semibold" >Hobbies</h5>
    <p class="text-center" >
    My speedcubing PB is <strong>12.54 seconds</strong>. Still working on getting that sub-10 time.
    </p>
    <p class="text-center" >
    I love music. Currently, learning piano.
    </p>

    <h5 class="text-center text-xl font-semibold" >Reading</h5>
    <p class="text-center" >
    I love reading. A new favorite is <strong><a href="https://en.wikipedia.org/wiki/Permutation_City"
        target="_blank">"Permutation City" by Dan Egan</a></strong>.
    </p>

    <ul class="service-list">

        <li class="service-item">
        <div class="service-icon-box">
            <ion-icon class="service-ion-icon" name="analytics-outline"></ion-icon>
        </div>
        <div class="service-content-box">
            <h4 class="h4 service-item-title">Data Visualization</h4>
            <p class="service-item-text">
            Visualizing, analyzing and modeling data for a variety of applications.
            </p>
        </div>
        </li>

        <li class="service-item">
        <div class="service-icon-box">
            <ion-icon class="service-ion-icon" name="phone-portrait-outline"></ion-icon>
        </div>
        <div class="service-content-box">
            <h4 class="h4 service-item-title">Mobile apps</h4>
            <p class="service-item-text">
            Development of applications for iOS using SwiftUI.
            </p>
        </div>
        </li>

        <li class="service-item">
        <div class="service-icon-box">
            <ion-icon class="service-ion-icon" name="rocket-outline"></ion-icon>
        </div>
        <div class="service-content-box">
            <h4 class="h4 service-item-title">LLMs</h4>
            <p class="service-item-text">
            Building LangChain driven LLM applications.
            </p>
        </div>
        </li>

        <li class="service-item">
        <div class="service-icon-box">
            <ion-icon class="service-ion-icon" name="layers-outline"></ion-icon>
        </div>
        <div class="service-content-box">
            <h4 class="h4 service-item-title">Machine Learning</h4>
            <p class="service-item-text">
            Development and training of models for data prediction.
            </p>
        </div>
        </li>

    </ul>

    <h2 class="h2 article-title">Resume</h2>

    <ion-icon name="book-outline"></ion-icon>

    <h3 class="h3">Education</h3>

        <ol class="timeline-list">

          <li class="timeline-item">

            <h4 class="h4 timeline-item-title">Colorado School of Mines</h4>

            <span>August 2021 — Present</span>

            <p class="timeline-text">
              Currently pursuing a BS in Computer Science. President and Co-founder of T1D@Mines.
            </p>

          </li>

          <li class="timeline-item">

            <h4 class="h4 timeline-item-title">McLean High School</h4>

            <span>August 2019 — June 2021</span>

            <p class="timeline-text">
              Graduated with an Advanced Diploma. Member of the National Honor Society.
            </p>

          </li>

        </ol>

      <section class="timeline">

        <div class="title-wrapper">
          <div class="icon-box">
            <ion-icon name="book-outline"></ion-icon>
          </div>

          <h3 class="h3">Experience</h3>
        </div>

        <ol class="timeline-list">

          <li class="timeline-item">
            <h4 class="h4 timeline-item-title">Field Session | Ricoh</h4>
            <span>August 2023 — December 2023</span>
            <p class="timeline-text">
              Created a LLM RAG application to help Ricoh troubleshoot printer issues through a chat interface.
              Achieved a 4x inference speedup through 4-bit quantization and a 4x reduction in cost over previous project.
            </p>
          </li>

          <li class="timeline-item">
            <h4 class="h4 timeline-item-title">Co-Founder | deal.io</h4>
            <span>January 2023 — Present</span>
            <p class="timeline-text">
              Collaborated with Nathan Howland and Levi Ortega to create <a href="https://apps.apple.com/app/id6446871125" target="_blank">two mobile
                apps</a> that connected students and restaurants in downtown Golden
              through student deals/discounts. Gained experience in fast-paced MVP development.
            </p>
          </li>

          <li class="timeline-item">
            <h4 class="h4 timeline-item-title">Data Science Intern | Rhombus Power</h4>
            <span>May 2022 — August 2022</span>
            <p class="timeline-text">
              Collaborated with colleagues to develop time-sensitive solutions with UNCLAS datasets.
              Created visual applications to explore/analyze USAF FYDP budget data using Python and Streamlit.
            </p>
          </li>
        </ol>

      </section>

      <section class="skill">

        <h2 class="h2 skills-title">Skills</h2>

        <ul class="skills-list content-card">

          <li class="skills-item">

            <div class="title-wrapper">
              <h5 class="h5">Python</h5>
              <data value="85">85%</data>
            </div>

            <div class="skill-progress-bg">
              <div class="skill-progress-fill" style="width: 85%;"></div>
            </div>

          </li>

          <li class="skills-item">

            <div class="title-wrapper">
              <h5 class="h5">Java</h5>
              <data value="30">30%</data>
            </div>

            <div class="skill-progress-bg">
              <div class="skill-progress-fill" style="width: 30%;"></div>
            </div>

          </li>

          <li class="skills-item">

            <div class="title-wrapper">
              <h5 class="h5">C | C++</h5>
              <data value="45">45%</data>
            </div>

            <div class="skill-progress-bg">
              <div class="skill-progress-fill" style="width: 45%;"></div>
            </div>

          </li>

          <li class="skills-item">

            <div class="title-wrapper">
              <h5 class="h5">Google Cloud</h5>
              <data value="20">20%</data>
            </div>

            <div class="skill-progress-bg">
              <div class="skill-progress-fill" style="width: 20%;"></div>
            </div>

          </li>

          <li class="skills-item">

            <div class="title-wrapper">
              <h5 class="h5">Firebase</h5>
              <data value="40">40%</data>
            </div>

            <div class="skill-progress-bg">
              <div class="skill-progress-fill" style="width: 40%;"></div>
            </div>

          </li>

          <li class="skills-item">

            <div class="title-wrapper">
              <h5 class="h5">SQL</h5>
              <data value="35">35%</data>
            </div>

            <div class="skill-progress-bg">
              <div class="skill-progress-fill" style="width: 35%;"></div>
            </div>

          </li>

          <li class="skills-item">

            <div class="title-wrapper">
              <h5 class="h5">Swift</h5>
              <data value="50">50%</data>
            </div>

            <div class="skill-progress-bg">
              <div class="skill-progress-fill" style="width: 50%;"></div>
            </div>

          </li>

          <li class="skills-item">

            <div class="title-wrapper">
              <h5 class="h5">Raspberry Pi</h5>
              <data value="40">40%</data>
            </div>

            <div class="skill-progress-bg">
              <div class="skill-progress-fill" style="width: 40%;"></div>
            </div>

          </li>

          <li class="skills-item">

            <div class="title-wrapper">
              <h5 class="h5">Git</h5>
              <data value="85">85%</data>
            </div>

            <div class="skill-progress-bg">
              <div class="skill-progress-fill" style="width: 85%;"></div>
            </div>

          </li>

          <li class="skills-item">

            <div class="title-wrapper">
              <h5 class="h5">Communication</h5>
              <data value="90">95%</data>
            </div>

            <div class="skill-progress-bg">
              <div class="skill-progress-fill" style="width: 95%;"></div>
            </div>

          </li>

          <li class="skills-item">

            <div class="title-wrapper">
              <h5 class="h5">Teamwork</h5>
              <data value="90">95%</data>
            </div>

            <div class="skill-progress-bg">
              <div class="skill-progress-fill" style="width: 95%;"></div>
            </div>

          </li>

          <li class="skills-item">

            <div class="title-wrapper">
              <h5 class="h5">Problem-solving</h5>
              <data value="90">95%</data>
            </div>

            <div class="skill-progress-bg">
              <div class="skill-progress-fill" style="width: 95%;"></div>
            </div>

          </li>

        </ul>

      </section>

      <div class="separator"></div>

      <header>
        <h2 class="h2 article-title">Contact</h2>
      </header>

      <!-- <section class="mapbox" data-mapbox>
        <figure>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d13242.271381872933!2d-105.23212069613895!3d39.75011722370795!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x876b9ad454b688a3%3A0x6a63eac2a9fc64fc!2sColorado%20School%20of%20Mines!5e0!3m2!1sen!2sus!4v1694457231797!5m2!1sen!2sus"
            width="400" height="300" loading="lazy"></iframe>
        </figure>
      </section> -->

</div>