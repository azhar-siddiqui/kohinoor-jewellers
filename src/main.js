(() => {
  "use strict";

  /* ---------- Helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- Image fallback: if a photo fails, show the gold gradient ---------- */
  const initImageFallback = () => {
    $$(".media img").forEach((img) => {
      const fail = () => img.closest(".media")?.classList.add("img-fail");
      img.addEventListener("error", fail);
      if (img.complete && img.naturalWidth === 0) fail();
    });
  };

  /* ---------- Sticky header: transparent -> blurred ---------- */
  const initHeader = () => {
    const header = $("#header");
    const update = () =>
      header.classList.toggle("is-scrolled", window.scrollY > 40);
    update();
    window.addEventListener("scroll", update, { passive: true });
  };

  /* ---------- Mobile drawer ---------- */
  const initDrawer = () => {
    const burger = $("#burger");
    const drawer = $("#drawer");

    const setOpen = (open) => {
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      drawer.classList.toggle("is-open", open);
      drawer.setAttribute("aria-hidden", String(!open));
      document.body.classList.toggle("no-scroll", open);
      if (open)
        setTimeout(() => $("#drawer-close").focus({ preventScroll: true }), 50);
    };

    burger.addEventListener("click", () =>
      setOpen(burger.getAttribute("aria-expanded") !== "true"),
    );
    $("#drawer-close").addEventListener("click", () => {
      setOpen(false);
      burger.focus({ preventScroll: true });
    });
    $$("a", drawer).forEach((a) =>
      a.addEventListener("click", () => setOpen(false)),
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
    window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => {
      if (e.matches) setOpen(false);
    });
  };

  /* ---------- Scroll reveal (Intersection Observer) ---------- */
  const initReveal = () => {
    const items = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    items.forEach((el) => io.observe(el));
  };

  /* ---------- Lightbox ---------- */
  const initLightbox = () => {
    const box = $("#lightbox");
    const img = $("#lightbox-img");
    const cap = $("#lightbox-caption");
    const items = $$(".gallery__item");
    let index = 0;
    let lastFocus = null;

    const show = (i) => {
      index = (i + items.length) % items.length;
      const el = items[index];
      img.src = el.dataset.full;
      img.alt = el.dataset.caption || "";
      cap.textContent = el.dataset.caption || "";
    };
    const open = (i) => {
      lastFocus = document.activeElement;
      show(i);
      box.classList.add("is-open");
      box.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll");
      $(".lightbox__close", box).focus();
    };
    const close = () => {
      box.classList.remove("is-open");
      box.setAttribute("aria-hidden", "true");
      document.body.classList.remove("no-scroll");
      lastFocus?.focus();
    };

    items.forEach((el, i) => el.addEventListener("click", () => open(i)));
    $(".lightbox__close", box).addEventListener("click", close);
    $(".lightbox__prev", box).addEventListener("click", () => show(index - 1));
    $(".lightbox__next", box).addEventListener("click", () => show(index + 1));
    box.addEventListener("click", (e) => {
      if (e.target === box) close();
    });

    document.addEventListener("keydown", (e) => {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
      if (e.key === "Tab") {
        // keep focus inside the dialog
        const f = $$("button", box);
        const first = f[0],
          last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    // Basic swipe support on touch screens
    let startX = 0;
    box.addEventListener(
      "touchstart",
      (e) => {
        startX = e.touches[0].clientX;
      },
      { passive: true },
    );
    box.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    });
  };

  /* ---------- Custom dropdown (replaces the native <select>) ---------- */
  const initCustomSelect = (form) => {
    const root = $("#interest-field");
    const btn = $("#interest-btn");
    const list = $("#interest-list");
    const hidden = $("#interest");
    const valueEl = $("#interest-value");
    const options = $$('[role="option"]', list);
    let active = 0;

    const selectedIndex = () =>
      options.findIndex((o) => o.dataset.value === hidden.value);
    const isOpen = () => root.classList.contains("is-open");

    const render = () => {
      const i = selectedIndex();
      valueEl.textContent = i > -1 ? options[i].textContent : t("o_choose");
      valueEl.classList.toggle("is-placeholder", i === -1);
      options.forEach((o, k) =>
        o.setAttribute("aria-selected", String(k === i)),
      );
    };

    const setActive = (i) => {
      active = Math.max(0, Math.min(options.length - 1, i));
      options.forEach((o, k) => o.classList.toggle("is-active", k === active));
      list.setAttribute("aria-activedescendant", options[active].id);
      options[active].scrollIntoView({ block: "nearest" });
    };

    const open = () => {
      // Open upwards if there is not enough room below
      const r = btn.getBoundingClientRect();
      const h = list.offsetHeight + 16;
      root.classList.toggle(
        "is-up",
        window.innerHeight - r.bottom < h && r.top > h,
      );
      root.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      setActive(Math.max(selectedIndex(), 0));
      list.focus({ preventScroll: true });
    };

    const close = (returnFocus = true) => {
      if (!isOpen()) return;
      root.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      if (returnFocus) btn.focus({ preventScroll: true });
    };

    const choose = (i) => {
      hidden.value = options[i].dataset.value;
      hidden.dispatchEvent(new Event("input", { bubbles: true }));
      render();
      close();
    };

    btn.addEventListener("click", () => (isOpen() ? close() : open()));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen()) open();
      }
    });

    list.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActive(active + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActive(active - 1);
          break;
        case "Home":
          e.preventDefault();
          setActive(0);
          break;
        case "End":
          e.preventDefault();
          setActive(options.length - 1);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          choose(active);
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
        case "Tab":
          close(false);
          break;
      }
    });

    options.forEach((o, i) => {
      o.addEventListener("click", () => choose(i));
      o.addEventListener("mousemove", () => {
        if (active !== i) setActive(i);
      });
    });

    document.addEventListener("click", (e) => {
      if (!root.contains(e.target)) close(false);
    });
    // form.reset() does not clear hidden inputs, so clear explicitly
    form.addEventListener("reset", () => {
      hidden.value = "";
      render();
    });
    document.addEventListener("langchange", render);
    render();
  };

  /* ---------- Custom date picker (replaces <input type="date">) ---------- */
  const initDatePicker = (form) => {
    const root = $("#date-field");
    const btn = $("#date-btn");
    const pop = $("#date-pop");
    const hidden = $("#date");
    const valueEl = $("#date-value");
    const title = $("#dp-title");
    const headRow = $("#dp-head");
    const body = $("#dp-body");
    const prev = $("#dp-prev");
    const next = $("#dp-next");
    const clearBtn = $("#dp-clear");
    const todayBtn = $("#dp-today");

    const pad = (n) => String(n).padStart(2, "0");
    const toISO = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const fromISO = (s) => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d);
    };
    const min = () => {
      const n = new Date();
      return new Date(n.getFullYear(), n.getMonth(), n.getDate());
    };
    const clampMin = (d) => (d < min() ? min() : d);
    const loc = () => (lang === "mr" ? "mr-IN" : "en-IN") + "-u-nu-latn";
    const fmt = (opts) => new Intl.DateTimeFormat(loc(), opts);
    const isOpen = () => root.classList.contains("is-open");

    let view = new Date(min().getFullYear(), min().getMonth(), 1);
    let focusDay = min();

    const renderValue = () => {
      valueEl.textContent = hidden.value
        ? fmt({ day: "numeric", month: "short", year: "numeric" }).format(
            fromISO(hidden.value),
          )
        : t("f_date_ph");
      valueEl.classList.toggle("is-placeholder", !hidden.value);
      prev.setAttribute("aria-label", t("cal_prev"));
      next.setAttribute("aria-label", t("cal_next"));
      pop.setAttribute("aria-label", t("cal_pick"));
    };

    const renderCal = () => {
      title.textContent = fmt({ month: "long", year: "numeric" }).format(view);

      headRow.innerHTML = "";
      for (let i = 0; i < 7; i++) {
        const d = new Date(2023, 0, 1 + i); // 1 Jan 2023 was a Sunday
        const th = document.createElement("th");
        th.scope = "col";
        th.textContent = fmt({
          weekday: lang === "mr" ? "short" : "narrow",
        }).format(d);
        th.setAttribute("abbr", fmt({ weekday: "long" }).format(d));
        headRow.appendChild(th);
      }

      const y = view.getFullYear(),
        m = view.getMonth();
      const lead = new Date(y, m, 1).getDay();
      const days = new Date(y, m + 1, 0).getDate();
      const minD = min();
      const sel = hidden.value;
      const fIso = toISO(focusDay);

      let html = "";
      let day = 1;
      for (let r = 0; r < 6 && day <= days; r++) {
        html += "<tr>";
        for (let c = 0; c < 7; c++) {
          if ((r === 0 && c < lead) || day > days) {
            html += "<td></td>";
            continue;
          }
          const d = new Date(y, m, day);
          const k = toISO(d);
          const off = d < minD;
          const cls = [
            "dp__day",
            k === sel ? "is-selected" : "",
            +d === +minD ? "is-today" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const label = fmt({
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(d);
          html += `<td role="gridcell" aria-selected="${k === sel}"><button type="button" class="${cls}" data-date="${k}" tabindex="${k === fIso ? 0 : -1}" aria-label="${label}"${off ? " disabled" : ""}>${day}</button></td>`;
          day++;
        }
        html += "</tr>";
      }
      body.innerHTML = html;
      prev.disabled =
        new Date(y, m, 1) <= new Date(minD.getFullYear(), minD.getMonth(), 1);
    };

    const shiftMonth = (n) => {
      view = new Date(view.getFullYear(), view.getMonth() + n, 1);
      const dim = new Date(
        view.getFullYear(),
        view.getMonth() + 1,
        0,
      ).getDate();
      focusDay = clampMin(
        new Date(
          view.getFullYear(),
          view.getMonth(),
          Math.min(focusDay.getDate(), dim),
        ),
      );
      renderCal();
    };

    const moveFocus = (d) => {
      focusDay = clampMin(d);
      view = new Date(focusDay.getFullYear(), focusDay.getMonth(), 1);
      renderCal();
      $(`.dp__day[data-date="${toISO(focusDay)}"]`, body)?.focus();
    };

    const open = () => {
      focusDay = clampMin(hidden.value ? fromISO(hidden.value) : min());
      view = new Date(focusDay.getFullYear(), focusDay.getMonth(), 1);
      renderCal();
      const r = btn.getBoundingClientRect();
      const h = pop.offsetHeight + 16;
      root.classList.toggle(
        "is-up",
        window.innerHeight - r.bottom < h && r.top > h,
      );
      root.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      setTimeout(
        () =>
          $('.dp__day[tabindex="0"]', body)?.focus({
            preventScroll: true,
          }),
        0,
      );
    };

    const close = (returnFocus = true) => {
      if (!isOpen()) return;
      root.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      if (returnFocus) btn.focus({ preventScroll: true });
    };

    const setValue = (value) => {
      hidden.value = value;
      hidden.dispatchEvent(new Event("input", { bubbles: true }));
      renderValue();
      close();
    };

    btn.addEventListener("click", () => (isOpen() ? close() : open()));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen()) open();
      }
    });

    prev.addEventListener("click", () => shiftMonth(-1));
    next.addEventListener("click", () => shiftMonth(1));
    clearBtn.addEventListener("click", () => setValue(""));
    todayBtn.addEventListener("click", () => setValue(toISO(min())));

    body.addEventListener("click", (e) => {
      const b = e.target.closest(".dp__day");
      if (b && !b.disabled) setValue(b.dataset.date);
    });
    body.addEventListener("focusin", (e) => {
      const b = e.target.closest(".dp__day");
      if (b) focusDay = fromISO(b.dataset.date);
    });

    // Keyboard: arrows move by day/week, PageUp/PageDown by month (Shift = year)
    body.addEventListener("keydown", (e) => {
      const d = new Date(focusDay);
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          d.setDate(d.getDate() - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          d.setDate(d.getDate() + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          d.setDate(d.getDate() - 7);
          break;
        case "ArrowDown":
          e.preventDefault();
          d.setDate(d.getDate() + 7);
          break;
        case "Home":
          e.preventDefault();
          d.setDate(d.getDate() - d.getDay());
          break;
        case "End":
          e.preventDefault();
          d.setDate(d.getDate() + (6 - d.getDay()));
          break;
        case "PageUp":
          e.preventDefault();
          d.setMonth(d.getMonth() - (e.shiftKey ? 12 : 1));
          break;
        case "PageDown":
          e.preventDefault();
          d.setMonth(d.getMonth() + (e.shiftKey ? 12 : 1));
          break;
        default:
          return;
      }
      moveFocus(d);
    });

    pop.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === "Tab" && !e.shiftKey && document.activeElement === todayBtn)
        close(false);
    });

    document.addEventListener("click", (e) => {
      if (!root.contains(e.target)) close(false);
    });
    form.addEventListener("reset", () => {
      hidden.value = "";
      renderValue();
    });
    document.addEventListener("langchange", renderValue);
    renderValue();
  };

  /* ---------- Appointment form ---------- */
  const initForm = () => {
    const form = $("#appointment-form");
    const status = $("#form-status");

    initCustomSelect(form);
    initDatePicker(form);

    const validateField = (input) => {
      const field = input.closest(".field");
      // Hidden inputs skip native validation, so check their value directly
      const ok =
        input.type === "hidden" ? !!input.value : input.checkValidity();
      field.classList.toggle("has-error", !ok);
      return ok;
    };

    $$("input[required]", form).forEach((input) => {
      input.addEventListener("blur", () => validateField(input));
      input.addEventListener("input", () => {
        if (input.closest(".field").classList.contains("has-error"))
          validateField(input);
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      status.className = "form__status";
      if ($(".hp", form).value) return; // honeypot caught a bot

      const results = $$("input[required]", form).map(validateField);
      if (results.includes(false)) {
        status.textContent = t("err_form");
        $$(
          '.has-error input:not([type="hidden"]), .has-error .cs__btn',
          form,
        )[0]?.focus();
        return;
      }

      /* TODO: connect to a real backend, e.g. fetch('/api/appointments', {...})
             or a form service such as Formspree. Currently shows a confirmation only. */
      status.textContent = t("ok_form");
      status.classList.add("is-success");
      form.reset();
    });
  };

  /* ---------- Language (English / Marathi) ---------- */
  const I18N = {
    en: {
      skip: "Skip to content",
      nav_collections: "Collections",
      nav_story: "Our Story",
      nav_gallery: "The Gallery",
      nav_contact: "Contact",
      cta_book: "Book Appointment",
      hero_title_a: "Timeless Elegance,",
      hero_title_b: "Crafted for Generations.",
      hero_sub:
        "Discover bespoke, curated fine jewelry by Asad Patel at Kohinoor Jewellers.",
      hero_cta1: "Explore Collections",
      hero_cta2: "Our Legacy",
      scroll: "Scroll",
      col_title: "Curated Collections",
      col_sub:
        "Four ways into the shop, each made to be worn, kept and handed down.",
      col1_t: "The Bridal Suite",
      col1_d: "Necklace sets, bangles and rings for the wedding day.",
      col2_t: "Modern Minimalist",
      col2_d: "Light chains and studs for everyday wear.",
      col3_t: "Bespoke Gold",
      col3_d: "Designed with you, then made by hand.",
      col4_t: "Heirloom Rings",
      col4_d: "Classic bands and solitaires built to last.",
      col_link: "View Collection →",
      story_title: "The Kohinoor Story",
      story_p1:
        "Kohinoor Jewellers began with a simple idea: jewellery is bought once and remembered for decades, so the shop behind it must earn that trust.",
      story_p2:
        "Asad Patel curates every piece himself. He chooses the gold, checks the stones and sits with each family to understand what the piece is for, whether a wedding, a birth or a promise.",
      v1_t: "Legacy",
      v1_d: "Pieces made to be passed on.",
      v2_t: "Purity",
      v2_d: "Honest metal, openly weighed and tested.",
      v3_t: "Trust",
      v3_d: "Clear prices and a word that holds.",
      owner: "Owner, Kohinoor Jewellers",
      gal_title: "The Lookbook",
      gal_sub:
        "Look closely. Select any image to see the finish and detail up close.",
      con_title: "Visit the Boutique",
      con_sub:
        "Choose a time and we will keep the shop quiet for you. Tell us what you are looking for and we will have pieces ready.",
      con_addr_t: "Address",
      con_visit_t: "Visits",
      con_visit_d: "By appointment, so each guest gets our full attention.",
      f_name: "Full name",
      f_phone: "Phone number",
      f_interest: "I am interested in",
      f_date: "Preferred date",
      f_msg: "Tell us about the piece you have in mind",
      o_choose: "Choose a collection",
      f_date_ph: "Select a date",
      cal_prev: "Previous month",
      cal_next: "Next month",
      cal_pick: "Choose a date",
      cal_clear: "Clear",
      cal_today: "Today",
      f_submit: "Request Exclusive Consultation",
      err_name: "Please enter your name.",
      err_phone: "Please enter a valid phone number.",
      err_interest: "Please choose a collection.",
      err_form: "Please fix the highlighted fields and try again.",
      ok_form:
        "Thank you. Your request is received and we will call you to confirm your visit.",
      foot_tag: "Fine jewellery for the moments families remember.",
      rights: "All rights reserved.",
      credit: "Bespoke curation by Asad Patel.",
    },
    mr: {
      skip: "मुख्य मजकुराकडे जा",
      nav_collections: "संग्रह",
      nav_story: "आमची गोष्ट",
      nav_gallery: "गॅलरी",
      nav_contact: "संपर्क",
      cta_book: "भेट निश्चित करा",
      hero_title_a: "कालातीत सौंदर्य,",
      hero_title_b: "पिढ्यानपिढ्यांसाठी घडवलेले.",
      hero_sub:
        "कोहिनूर ज्वेलर्समध्ये असद पटेल यांनी निवडलेले खास, उत्कृष्ट दागिने पाहा.",
      hero_cta1: "संग्रह पाहा",
      hero_cta2: "आमचा वारसा",
      scroll: "खाली जा",
      col_title: "निवडक संग्रह",
      col_sub:
        "दुकानात येण्याचे चार मार्ग. प्रत्येक दागिना घालण्यासाठी, जपण्यासाठी आणि पुढच्या पिढीला देण्यासाठी.",
      col1_t: "वधू संग्रह",
      col1_d: "लग्नाच्या दिवसासाठी हार, बांगड्या आणि अंगठ्या.",
      col2_t: "आधुनिक साधेपणा",
      col2_d: "रोजच्या वापरासाठी हलक्या साखळ्या आणि कर्णफुले.",
      col3_t: "खास बनवलेले सोने",
      col3_d: "तुमच्यासोबत डिझाइन करून हाताने बनवलेले.",
      col4_t: "वारसा अंगठ्या",
      col4_d: "टिकाऊ पारंपरिक बँड आणि सॉलिटेअर.",
      col_link: "संग्रह पाहा →",
      story_title: "कोहिनूरची गोष्ट",
      story_p1:
        "कोहिनूर ज्वेलर्सची सुरुवात एका साध्या विचाराने झाली: दागिना एकदाच घेतला जातो आणि दशकानुदशके लक्षात राहतो, म्हणून त्यामागचा विश्वास कमवावा लागतो.",
      story_p2:
        "असद पटेल प्रत्येक दागिना स्वतः निवडतात. सोने निवडणे, खडे तपासणे आणि प्रत्येक कुटुंबासोबत बसून तो दागिना कशासाठी आहे, लग्न, जन्म किंवा वचन, हे समजून घेणे ते स्वतः करतात.",
      v1_t: "वारसा",
      v1_d: "पुढच्या पिढीला देता येतील असे दागिने.",
      v2_t: "शुद्धता",
      v2_d: "प्रामाणिक धातू, समोर तोललेला आणि तपासलेला.",
      v3_t: "विश्वास",
      v3_d: "स्पष्ट किंमत आणि दिलेला शब्द पाळणे.",
      owner: "मालक, कोहिनूर ज्वेलर्स",
      gal_title: "लुकबुक",
      gal_sub: "जवळून पाहा. कोणत्याही चित्रावर क्लिक करून बारकावे पाहा.",
      con_title: "आमच्या दुकानाला भेट द्या",
      con_sub:
        "वेळ निवडा, आम्ही तुमच्यासाठी दुकानात शांतता ठेवू. तुम्हाला काय हवे ते सांगा, आम्ही दागिने तयार ठेवू.",
      con_addr_t: "पत्ता",
      con_visit_t: "भेटी",
      con_visit_d:
        "पूर्वनियोजित वेळेनुसार, जेणेकरून प्रत्येक पाहुण्याकडे पूर्ण लक्ष देता येईल.",
      f_name: "पूर्ण नाव",
      f_phone: "फोन नंबर",
      f_interest: "मला यात रस आहे",
      f_date: "सोयीची तारीख",
      f_msg: "तुम्हाला कोणता दागिना हवा आहे ते सांगा",
      o_choose: "संग्रह निवडा",
      f_date_ph: "तारीख निवडा",
      cal_prev: "मागील महिना",
      cal_next: "पुढील महिना",
      cal_pick: "तारीख निवडा",
      cal_clear: "पुसून टाका",
      cal_today: "आज",
      f_submit: "खास सल्ल्यासाठी विनंती करा",
      err_name: "कृपया तुमचे नाव लिहा.",
      err_phone: "कृपया योग्य फोन नंबर लिहा.",
      err_interest: "कृपया संग्रह निवडा.",
      err_form: "कृपया चिन्हांकित रकाने दुरुस्त करून पुन्हा प्रयत्न करा.",
      ok_form:
        "धन्यवाद. तुमची विनंती मिळाली आहे. भेट निश्चित करण्यासाठी आम्ही तुम्हाला फोन करू.",
      foot_tag: "कुटुंबांच्या आठवणीतील क्षणांसाठी उत्कृष्ट दागिने.",
      rights: "सर्व हक्क राखीव.",
      credit: "असद पटेल यांनी निवडलेले खास दागिने.",
    },
  };

  let lang = "en";
  const t = (key) => (I18N[lang] && I18N[lang][key]) || I18N.en[key] || "";

  const applyLang = (next) => {
    lang = next;
    document.documentElement.lang = lang === "mr" ? "mr" : "en";
    $$("[data-i18n]").forEach((el) => {
      const v = t(el.dataset.i18n);
      if (v) el.textContent = v;
    });
    $$("[data-lang-toggle]").forEach((b) => {
      b.textContent = lang === "mr" ? "English" : "मराठी";
    });
    document.dispatchEvent(new Event("langchange")); // let custom controls re-render
    try {
      localStorage.setItem("kohinoor-lang", lang);
    } catch (_) {
      /* storage unavailable */
    }
  };

  const initLang = () => {
    let saved = "en";
    try {
      saved = localStorage.getItem("kohinoor-lang") || "en";
    } catch (_) {}
    if (saved !== "en") applyLang(saved);
    $$("[data-lang-toggle]").forEach((b) =>
      b.addEventListener("click", () => applyLang(lang === "en" ? "mr" : "en")),
    );
  };

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    $("#year").textContent = new Date().getFullYear();
    initImageFallback();
    initHeader();
    initDrawer();
    initReveal();
    initLightbox();
    initForm();
    initLang();
  });
})();
