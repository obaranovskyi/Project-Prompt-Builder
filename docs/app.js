// ── State ────────────────────────────────────────────────────────────────
const state = {
  projectType: null,   // e.g. 'web_frontend'
  subtype: '',
  language: '',
  framework: '',
  targetTool: '',
  extraTech: {},       // { 'Category': Set(['tech1', 'tech2']) }
  answers: {},         // { 'phase_id.question_id': value }
};

// Helpers to get/set answers
function getAnswer(phaseId, qId) {
  return state.answers[`${phaseId}.${qId}`] ?? null;
}
function setAnswer(phaseId, qId, value) {
  state.answers[`${phaseId}.${qId}`] = value;
}

// ── Bootstrap ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderTabs();
  renderProjectTypeList();
  renderTargetToolSelect();
  renderBrowseTab();
  selectProjectType(PROJECT_TYPES[0].type);
});

// ── Tabs ─────────────────────────────────────────────────────────────────
function renderTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === target);
        t.setAttribute('aria-selected', t.dataset.tab === target);
      });
      document.getElementById('tab-builder').style.display = target === 'builder' ? 'flex' : 'none';
      document.getElementById('tab-browse').style.display = target === 'browse' ? 'flex' : 'none';
      if (target === 'browse') renderBrowseTab();
    });
  });
}

// ── Project Type List ─────────────────────────────────────────────────────
function renderProjectTypeList() {
  const container = document.getElementById('project-type-list');
  container.innerHTML = '';
  PROJECT_TYPES.forEach(pt => {
    const el = document.createElement('button');
    el.className = 'project-type-item';
    el.innerHTML = `
      <span class="pt-icon">${pt.icon}</span>
      <span class="pt-info">
        <span class="pt-label">${pt.label}</span>
        <span class="pt-desc">${pt.description}</span>
      </span>
    `;
    el.addEventListener('click', () => selectProjectType(pt.type));
    container.appendChild(el);
  });
}

function selectProjectType(typeId) {
  state.projectType = typeId;
  state.subtype = '';
  state.language = '';
  state.framework = '';
  state.extraTech = {};
  // mark active
  document.querySelectorAll('.project-type-item').forEach((el, i) => {
    el.classList.toggle('active', PROJECT_TYPES[i].type === typeId);
  });
  const pt = PROJECT_TYPES.find(p => p.type === typeId);
  renderTopBarSelects(pt);
  renderEcosystem();
  renderPhaseSections(pt);
  regeneratePrompt();
}

// ── Top Bar Selects ───────────────────────────────────────────────────────
function renderTopBarSelects(pt) {
  // Subtype
  const subtypeSel = document.getElementById('sel-subtype');
  subtypeSel.innerHTML = '<option value="">— any subtype —</option>';
  (pt.subtypes || []).forEach(st => {
    const opt = document.createElement('option');
    opt.value = st;
    opt.textContent = st.replace(/_/g, ' ');
    subtypeSel.appendChild(opt);
  });
  subtypeSel.value = state.subtype;
  subtypeSel.onchange = () => { state.subtype = subtypeSel.value; regeneratePrompt(); };

  // Language
  const langSel = document.getElementById('sel-language');
  langSel.innerHTML = '<option value="">— select language —</option>';
  const stacksForType = TECH_STACKS[pt.type] || {};
  const languages = Object.keys(stacksForType);
  languages.forEach(lang => {
    const opt = document.createElement('option');
    opt.value = lang;
    opt.textContent = lang;
    langSel.appendChild(opt);
  });
  langSel.value = state.language;
  langSel.onchange = () => {
    state.language = langSel.value;
    state.framework = '';
    state.extraTech = {};
    populateFrameworkSelect(pt);
    renderEcosystem();
    regeneratePrompt();
  };

  // Framework (initially empty if no language selected)
  populateFrameworkSelect(pt);
}

function populateFrameworkSelect(pt) {
  const frameworkSel = document.getElementById('sel-framework');
  const stacksForType = TECH_STACKS[pt.type] || {};
  const frameworks = state.language ? (stacksForType[state.language] || []) : [];

  if (!frameworks.length) {
    frameworkSel.innerHTML = '<option value="">— pick language first —</option>';
    frameworkSel.disabled = true;
    frameworkSel.onchange = null;
    return;
  }

  frameworkSel.disabled = false;
  frameworkSel.innerHTML = '<option value="">— any framework —</option>';
  frameworks.forEach(fw => {
    const opt = document.createElement('option');
    opt.value = fw;
    opt.textContent = fw;
    frameworkSel.appendChild(opt);
  });
  frameworkSel.value = state.framework;
  frameworkSel.onchange = () => {
    state.framework = frameworkSel.value;
    state.extraTech = {};
    renderEcosystem();
    regeneratePrompt();
  };
}

// ── Tech Ecosystem Panel ──────────────────────────────────────────────────
function renderEcosystem() {
  const el = document.getElementById('tech-ecosystem');
  const ecosystem = FRAMEWORK_ECOSYSTEM[state.framework];

  if (!ecosystem || !state.framework) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }

  el.style.display = 'block';

  const categories = Object.keys(ecosystem);

  el.innerHTML = `
    <div class="eco-card">
      <div class="eco-card-header">
        <span class="eco-card-title">Stack Technologies</span>
        <span class="eco-card-sub">${state.language} &rsaquo; ${state.framework}</span>
        <button class="eco-clear-btn" id="eco-clear">Clear all</button>
      </div>
      <div class="eco-body" id="eco-body"></div>
    </div>
  `;

  const body = el.querySelector('#eco-body');

  categories.forEach(cat => {
    const options = ecosystem[cat];
    const row = document.createElement('div');
    row.className = 'eco-row';

    const label = document.createElement('span');
    label.className = 'eco-cat-label';
    label.textContent = cat;
    row.appendChild(label);

    const pills = document.createElement('div');
    pills.className = 'eco-pills';

    options.forEach(tech => {
      const btn = document.createElement('button');
      btn.className = 'eco-pill' + (isEcoSelected(cat, tech) ? ' on' : '');
      btn.textContent = tech;
      btn.addEventListener('click', () => {
        toggleEco(cat, tech);
        btn.classList.toggle('on', isEcoSelected(cat, tech));
        regeneratePrompt();
      });
      pills.appendChild(btn);
    });

    row.appendChild(pills);
    body.appendChild(row);
  });

  el.querySelector('#eco-clear').addEventListener('click', () => {
    state.extraTech = {};
    el.querySelectorAll('.eco-pill').forEach(p => p.classList.remove('on'));
    regeneratePrompt();
  });
}

function isEcoSelected(cat, tech) {
  return !!(state.extraTech[cat] && state.extraTech[cat].has(tech));
}

function toggleEco(cat, tech) {
  if (!state.extraTech[cat]) state.extraTech[cat] = new Set();
  if (state.extraTech[cat].has(tech)) {
    state.extraTech[cat].delete(tech);
  } else {
    state.extraTech[cat].add(tech);
  }
}

// ── Target Tool Select ────────────────────────────────────────────────────
function renderTargetToolSelect() {
  const sel = document.getElementById('sel-target-tool');
  sel.innerHTML = '<option value="">— select tool —</option>';
  TARGET_TOOLS.forEach(tool => {
    const opt = document.createElement('option');
    opt.value = tool;
    opt.textContent = tool;
    sel.appendChild(opt);
  });
  sel.onchange = () => {
    state.targetTool = sel.value;
    const cfg = TOOL_CONFIG[state.targetTool];
    const noteEl = document.getElementById('tool-note');
    if (cfg && cfg.note) {
      noteEl.textContent = cfg.note;
      noteEl.style.display = 'block';
    } else {
      noteEl.style.display = 'none';
    }
    regeneratePrompt();
  };
}

// ── Reset ─────────────────────────────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click', () => {
  const pt = PROJECT_TYPES.find(p => p.type === state.projectType);
  if (!pt) return;

  state.subtype   = '';
  state.language  = '';
  state.framework = '';
  state.extraTech = {};
  state.answers   = {};

  renderTopBarSelects(pt);
  document.getElementById('sel-subtype').value  = '';
  document.getElementById('sel-language').value = '';

  const frameworkSel = document.getElementById('sel-framework');
  frameworkSel.innerHTML = '<option value="">— pick language first —</option>';
  frameworkSel.disabled  = true;

  document.getElementById('sel-target-tool').value = '';
  document.getElementById('tool-note').style.display = 'none';

  renderEcosystem();
  renderPhaseSections(pt);
  regeneratePrompt();
});

// ── Collapse / Expand All ─────────────────────────────────────────────────
let allExpanded = false;

document.getElementById('btn-toggle-all').addEventListener('click', () => {
  allExpanded = !allExpanded;
  document.querySelectorAll('#phase-sections .phase-header').forEach(h => {
    h.classList.toggle('open', allExpanded);
    h.nextElementSibling.classList.toggle('open', allExpanded);
  });
  document.getElementById('btn-toggle-all').textContent = allExpanded ? 'Collapse All' : 'Expand All';
});

// ── Phase Sections ────────────────────────────────────────────────────────
function renderPhaseSections(pt) {
  allExpanded = false;
  document.getElementById('btn-toggle-all').textContent = 'Expand All';
  const container = document.getElementById('phase-sections');
  container.innerHTML = '';
  document.getElementById('phase-toolbar').style.display = 'flex';

  const toolCfg = TOOL_CONFIG[state.targetTool] || { skip: [] };

  pt.phases.forEach(phaseRef => {
    const phase = PHASES[phaseRef.id];
    if (!phase) return;

    const section = document.createElement('div');
    section.className = 'phase-section';
    section.dataset.phase = phase.id;

    section.innerHTML = `
      <div class="phase-header" data-phase="${phase.id}">
        <span class="phase-name">${phase.name}</span>
        <span class="phase-badge ${phaseRef.required ? 'required' : 'optional'}">
          ${phaseRef.required ? 'required' : 'optional'}
        </span>
        <svg class="phase-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      <div class="phase-body" id="phase-body-${phase.id}">
        <div class="phase-fields" id="phase-fields-${phase.id}"></div>
      </div>
    `;

    container.appendChild(section);

    // Toggle collapse
    section.querySelector('.phase-header').addEventListener('click', () => {
      const header = section.querySelector('.phase-header');
      const body = section.querySelector('.phase-body');
      const open = body.classList.toggle('open');
      header.classList.toggle('open', open);
    });

    renderPhaseFields(phase);
  });
}

function renderPhaseFields(phase) {
  const container = document.getElementById(`phase-fields-${phase.id}`);
  if (!container) return;
  container.innerHTML = '';

  phase.questions.forEach(q => {
    if (!checkDependency(phase.id, q)) return;
    const fg = buildFieldGroup(phase.id, q);
    container.appendChild(fg);
  });
}

function checkDependency(phaseId, q) {
  if (!q.depends_on) return true;
  const dep = q.depends_on;
  const val = getAnswer(phaseId, dep.question);
  if (dep.value !== undefined) {
    if (dep.value === true) return val === true;
    if (dep.value === false) return val === false;
    return val === dep.value;
  }
  if (dep.not !== undefined) return val !== dep.not;
  if (dep.contains !== undefined) return Array.isArray(val) && val.includes(dep.contains);
  return true;
}

function buildFieldGroup(phaseId, q) {
  const fg = document.createElement('div');
  fg.className = 'field-group' + (q.type === 'multiline' || q.type === 'multiselect' ? ' full-width' : '');
  fg.dataset.qid = q.id;
  fg.dataset.phase = phaseId;

  const label = document.createElement('label');
  label.className = 'field-label';
  label.textContent = q.prompt;
  fg.appendChild(label);

  if (q.type === 'text') {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'text-input';
    input.placeholder = q.note || '';
    input.value = getAnswer(phaseId, q.id) || '';
    input.addEventListener('input', () => { setAnswer(phaseId, q.id, input.value); regeneratePrompt(); });
    fg.appendChild(input);

  } else if (q.type === 'multiline') {
    const ta = document.createElement('textarea');
    ta.className = 'textarea-input';
    ta.placeholder = q.note || 'One per line…';
    ta.value = getAnswer(phaseId, q.id) || '';
    ta.addEventListener('input', () => { setAnswer(phaseId, q.id, ta.value); regeneratePrompt(); });
    fg.appendChild(ta);

  } else if (q.type === 'select') {
    const wrap = document.createElement('div');
    wrap.className = 'custom-select-wrap';
    const sel = document.createElement('select');
    sel.className = 'custom-select';
    sel.innerHTML = '<option value="">— select —</option>';
    (q.options || []).forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      sel.appendChild(o);
    });
    sel.value = getAnswer(phaseId, q.id) || '';
    sel.addEventListener('change', () => {
      setAnswer(phaseId, q.id, sel.value);
      // Re-render phase to update dependent fields
      const phase = PHASES[phaseId];
      if (phase) renderPhaseFields(phase);
      regeneratePrompt();
    });
    wrap.appendChild(sel);
    fg.appendChild(wrap);

  } else if (q.type === 'boolean') {
    const wrap = document.createElement('div');
    wrap.className = 'toggle-wrap';
    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = getAnswer(phaseId, q.id) === true;
    const slider = document.createElement('span');
    slider.className = 'toggle-slider';
    toggleLabel.appendChild(checkbox);
    toggleLabel.appendChild(slider);
    const textLabel = document.createElement('span');
    textLabel.className = 'toggle-label';
    textLabel.textContent = checkbox.checked ? 'Yes' : 'No';
    checkbox.addEventListener('change', () => {
      setAnswer(phaseId, q.id, checkbox.checked);
      textLabel.textContent = checkbox.checked ? 'Yes' : 'No';
      const phase = PHASES[phaseId];
      if (phase) renderPhaseFields(phase);
      regeneratePrompt();
    });
    wrap.appendChild(toggleLabel);
    wrap.appendChild(textLabel);
    fg.innerHTML = '';
    fg.appendChild(label);
    fg.appendChild(wrap);

  } else if (q.type === 'multiselect') {
    const current = getAnswer(phaseId, q.id) || [];
    const msWrap = document.createElement('div');
    msWrap.className = 'multiselect-field';

    const chipsRow = document.createElement('div');
    chipsRow.className = 'multiselect-chips';

    const optionsRow = document.createElement('div');
    optionsRow.className = 'multiselect-options';

    function refreshChips() {
      chipsRow.innerHTML = '';
      current.forEach(val => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.innerHTML = `${val} <button class="chip-remove" data-val="${val}" title="Remove">&times;</button>`;
        chip.querySelector('.chip-remove').addEventListener('click', () => {
          const idx = current.indexOf(val);
          if (idx > -1) current.splice(idx, 1);
          setAnswer(phaseId, q.id, [...current]);
          refreshChips();
          refreshOptions();
          regeneratePrompt();
        });
        chipsRow.appendChild(chip);
      });
    }

    function refreshOptions() {
      optionsRow.innerHTML = '';
      (q.options || []).forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'ms-option' + (current.includes(opt) ? ' selected' : '');
        btn.textContent = opt;
        btn.addEventListener('click', () => {
          if (current.includes(opt)) {
            current.splice(current.indexOf(opt), 1);
          } else {
            current.push(opt);
          }
          setAnswer(phaseId, q.id, [...current]);
          refreshChips();
          refreshOptions();
          regeneratePrompt();
        });
        optionsRow.appendChild(btn);
      });
    }

    refreshChips();
    refreshOptions();
    msWrap.appendChild(chipsRow);
    msWrap.appendChild(optionsRow);
    fg.appendChild(msWrap);
  }

  if (q.note && q.type !== 'text') {
    const note = document.createElement('p');
    note.className = 'field-note';
    note.textContent = q.note;
    fg.appendChild(note);
  }

  return fg;
}

// ── Prompt Generation ─────────────────────────────────────────────────────
function regeneratePrompt() {
  const pt = PROJECT_TYPES.find(p => p.type === state.projectType);
  const output = document.getElementById('prompt-output');
  const empty = document.getElementById('prompt-empty');

  if (!pt) {
    output.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  const prompt = buildPrompt(pt);

  if (!prompt.trim()) {
    output.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  output.textContent = prompt;
  output.style.display = 'block';
  empty.style.display = 'none';
}

function buildPrompt(pt) {
  const toolCfg = TOOL_CONFIG[state.targetTool] || { skip: [], style: 'detailed-technical' };
  const skipped = new Set(toolCfg.skip || []);
  const lines = [];

  // ── Header
  if (state.targetTool) {
    lines.push(`# Project Prompt — ${state.targetTool}`);
  } else {
    lines.push('# Project Prompt');
  }
  lines.push('');

  // ── Project Overview
  const projName = getAnswer('project_identity', 'name');
  const projDesc = getAnswer('project_identity', 'description');
  const purpose  = getAnswer('requirements', 'purpose');
  const audience = getAnswer('requirements', 'target_audience');
  const scope    = getAnswer('requirements', 'mvp_scope');

  const hasOverview = projName || projDesc || purpose || audience || scope ||
    state.projectType || state.subtype || state.technology;

  if (hasOverview) {
    lines.push('## Project Overview');
    if (projName)       lines.push(`**Name:** ${projName}`);
    if (projDesc)       lines.push(`**Description:** ${projDesc}`);
    if (purpose)        lines.push(`**Purpose:** ${purpose}`);
    if (audience)       lines.push(`**Target Audience:** ${audience}`);
    if (scope)          lines.push(`**Scope:** ${scope}`);
    lines.push('');
  }

  // ── Tech Stack
  const author  = getAnswer('project_identity', 'author');
  const runtime = getAnswer('project_identity', 'runtime_version');
  const pkgMgr  = getAnswer('project_identity', 'package_manager');
  const monorepo = getAnswer('project_identity', 'monorepo');
  const license = getAnswer('project_identity', 'license');

  const ecoEntries = Object.entries(state.extraTech)
    .map(([cat, set]) => [cat, [...set].filter(Boolean)])
    .filter(([, arr]) => arr.length > 0);

  const hasStack = state.language || state.framework || state.subtype || runtime || pkgMgr || monorepo || license || author || ecoEntries.length;
  if (hasStack) {
    lines.push('## Tech Stack');
    lines.push(`**Project Type:** ${pt.label}${state.subtype ? ` › ${state.subtype.replace(/_/g, ' ')}` : ''}`);
    if (state.language)  lines.push(`**Language:** ${state.language}`);
    if (state.framework) lines.push(`**Framework:** ${state.framework}`);
    if (runtime)    lines.push(`**Runtime / Version:** ${runtime}`);
    if (pkgMgr && pkgMgr !== 'auto') lines.push(`**Package Manager:** ${pkgMgr}`);
    if (monorepo)   lines.push(`**Structure:** ${monorepo}`);
    if (license && license !== 'none') lines.push(`**License:** ${license}`);
    if (author)     lines.push(`**Author / Team:** ${author}`);
    if (ecoEntries.length) {
      lines.push('');
      lines.push('**Additional Libraries:**');
      ecoEntries.forEach(([cat, techs]) => {
        lines.push(`  - **${cat}:** ${techs.join(', ')}`);
      });
    }
    lines.push('');
  }

  // ── Features & Requirements
  if (!skipped.has('requirements')) {
    const features = getAnswer('requirements', 'core_features');
    const pages    = getAnswer('requirements', 'pages_screens');
    const flows    = getAnswer('requirements', 'user_flows');
    if (features || pages || flows) {
      lines.push('## Features & Requirements');
      if (features) { lines.push('**Core Features:**'); lines.push(indentMultiline(features)); }
      if (pages)    { lines.push('**Pages / Screens:**'); lines.push(indentMultiline(pages)); }
      if (flows)    { lines.push('**User Flows:**'); lines.push(indentMultiline(flows)); }
      lines.push('');
    }
  }

  // ── Design & UI
  if (!skipped.has('design') && pt.phases.some(p => p.id === 'design')) {
    const style    = getAnswer('design', 'style');
    const colors   = getAnswer('design', 'color_scheme');
    const compLib  = getAnswer('design', 'component_library');
    const darkMode = getAnswer('design', 'dark_mode');
    const responsive = getAnswer('design', 'responsive');
    const reference  = getAnswer('design', 'reference');
    if (style || colors || compLib || darkMode || responsive || reference) {
      lines.push('## Design & UI');
      if (style)      lines.push(`**Visual Style:** ${style}`);
      if (colors)     lines.push(`**Color Scheme:** ${colors}`);
      if (compLib && compLib !== 'none') lines.push(`**Component Library:** ${compLib}`);
      if (darkMode)   lines.push(`**Dark Mode:** ${darkMode}`);
      if (responsive) lines.push(`**Responsive Priority:** ${responsive}`);
      if (reference)  lines.push(`**Reference / Inspiration:** ${reference}`);
      lines.push('');
    }
  }

  // ── Data Model
  if (!skipped.has('database') && pt.phases.some(p => p.id === 'database')) {
    const dbType   = getAnswer('database', 'type');
    const engine   = getAnswer('database', 'engine');
    const orm      = getAnswer('database', 'orm');
    const migrations = getAnswer('database', 'migrations');
    const seeding  = getAnswer('database', 'seeding');
    if (dbType && dbType !== 'none') {
      lines.push('## Data Model');
      lines.push(`**Database Type:** ${dbType}`);
      if (engine && engine !== 'none') lines.push(`**Engine:** ${engine}`);
      if (orm && orm !== 'none')       lines.push(`**ORM / Query Builder:** ${orm}`);
      if (migrations && migrations !== 'none') lines.push(`**Migrations:** ${migrations}`);
      if (seeding !== null) lines.push(`**Seed Data:** ${seeding ? 'Yes' : 'No'}`);
      lines.push('');
    }
  }

  // ── Authentication
  if (!skipped.has('auth') && pt.phases.some(p => p.id === 'auth')) {
    const strategy = getAnswer('auth', 'strategy');
    if (strategy && strategy !== 'none') {
      const provider = getAnswer('auth', 'provider');
      const social   = getAnswer('auth', 'social_login');
      const mfa      = getAnswer('auth', 'mfa');
      const rbac     = getAnswer('auth', 'rbac');
      lines.push('## Authentication');
      lines.push(`**Strategy:** ${strategy}`);
      if (provider && provider !== 'none') lines.push(`**Provider:** ${provider}`);
      if (social && social.length)  lines.push(`**Social Login:** ${social.join(', ')}`);
      if (mfa  !== null) lines.push(`**MFA:** ${mfa ? 'Yes' : 'No'}`);
      if (rbac !== null) lines.push(`**RBAC:** ${rbac ? 'Yes' : 'No'}`);
      lines.push('');
    }
  }

  // ── Integrations
  if (!skipped.has('integrations') && pt.phases.some(p => p.id === 'integrations')) {
    const payments  = getAnswer('integrations', 'payments');
    const email     = getAnswer('integrations', 'email');
    const storage   = getAnswer('integrations', 'storage');
    const maps      = getAnswer('integrations', 'maps');
    const analytics = getAnswer('integrations', 'analytics');
    const realtime  = getAnswer('integrations', 'realtime');
    const ai        = getAnswer('integrations', 'ai');
    const other     = getAnswer('integrations', 'other');
    const hasAny = [payments, email, storage, maps, analytics, realtime, ai, other]
      .some(v => v && v !== 'none');
    if (hasAny) {
      lines.push('## Integrations');
      if (payments  && payments  !== 'none') lines.push(`**Payments:** ${payments}`);
      if (email     && email     !== 'none') lines.push(`**Email:** ${email}`);
      if (storage   && storage   !== 'none') lines.push(`**File Storage:** ${storage}`);
      if (maps      && maps      !== 'none') lines.push(`**Maps:** ${maps}`);
      if (analytics && analytics !== 'none') lines.push(`**Analytics:** ${analytics}`);
      if (realtime  && realtime  !== 'none') lines.push(`**Real-time:** ${realtime}`);
      if (ai        && ai        !== 'none') lines.push(`**AI / LLM:** ${ai}`);
      if (other)                             lines.push(`**Other:** ${other}`);
      lines.push('');
    }
  }

  // ── Internationalization
  if (!skipped.has('i18n') && pt.phases.some(p => p.id === 'i18n')) {
    const i18nEnabled = getAnswer('i18n', 'enabled');
    if (i18nEnabled) {
      const defaultLocale = getAnswer('i18n', 'default_locale');
      const extraLocales  = getAnswer('i18n', 'additional_locales');
      const i18nTool      = getAnswer('i18n', 'tool');
      lines.push('## Internationalization');
      lines.push(`**Enabled:** Yes`);
      if (defaultLocale) lines.push(`**Default Locale:** ${defaultLocale}`);
      if (extraLocales)  lines.push(`**Additional Locales:** ${extraLocales}`);
      if (i18nTool && i18nTool !== 'none') lines.push(`**Library:** ${i18nTool}`);
      lines.push('');
    }
  }

  // ── Infrastructure
  const infraSkipped = skipped.has('containerization') && skipped.has('ci_cd') &&
    skipped.has('deployment') && skipped.has('environment_and_secrets');

  if (!infraSkipped) {
    const infraLines = [];

    if (!skipped.has('deployment') && pt.phases.some(p => p.id === 'deployment')) {
      const platform = getAnswer('deployment', 'provider');
      const runtime  = getAnswer('deployment', 'runtime');
      const iac      = getAnswer('deployment', 'iac');
      if (platform && platform !== 'none') {
        infraLines.push(`**Deployment Platform:** ${platform}`);
        if (runtime) infraLines.push(`**Runtime:** ${runtime}`);
        if (iac && iac !== 'none') infraLines.push(`**IaC:** ${iac}`);
      }
    }

    if (!skipped.has('containerization') && pt.phases.some(p => p.id === 'containerization')) {
      const dockerfile = getAnswer('containerization', 'dockerfile');
      if (dockerfile) {
        const registry   = getAnswer('containerization', 'registry');
        const base       = getAnswer('containerization', 'base_image');
        const compose    = getAnswer('containerization', 'compose');
        const multiStage = getAnswer('containerization', 'multi_stage');
        infraLines.push(`**Docker:** Yes${multiStage ? ' (multi-stage)' : ''}${compose ? ' + Compose' : ''}`);
        if (registry && registry !== 'none') infraLines.push(`**Registry:** ${registry}`);
        if (base) infraLines.push(`**Base Image:** ${base}`);
      }
    }

    if (!skipped.has('ci_cd') && pt.phases.some(p => p.id === 'ci_cd')) {
      const ciProvider = getAnswer('ci_cd', 'provider');
      const stages     = getAnswer('ci_cd', 'stages');
      if (ciProvider && ciProvider !== 'none') {
        infraLines.push(`**CI/CD:** ${ciProvider}`);
        if (stages && stages.length) infraLines.push(`**Pipeline Stages:** ${stages.join(' → ')}`);
      }
    }

    if (!skipped.has('environment_and_secrets') && pt.phases.some(p => p.id === 'environment_and_secrets')) {
      const envs    = getAnswer('environment_and_secrets', 'environments');
      const secrets = getAnswer('environment_and_secrets', 'secrets_manager');
      if (envs && envs.length) infraLines.push(`**Environments:** ${envs.join(', ')}`);
      if (secrets && secrets !== 'none') infraLines.push(`**Secrets Manager:** ${secrets}`);
    }

    if (infraLines.length) {
      lines.push('## Infrastructure & Setup');
      infraLines.forEach(l => lines.push(l));
      lines.push('');
    }
  }

  // ── Observability
  if (!skipped.has('observability') && pt.phases.some(p => p.id === 'observability')) {
    const logging   = getAnswer('observability', 'logging');
    const metrics   = getAnswer('observability', 'metrics');
    const tracing   = getAnswer('observability', 'tracing');
    const errors    = getAnswer('observability', 'error_tracking');
    const hasObs = [logging, metrics, tracing, errors].some(v => v && v !== 'none');
    if (hasObs) {
      lines.push('## Observability');
      if (logging && logging !== 'none') lines.push(`**Logging:** ${logging}`);
      if (metrics && metrics !== 'none') lines.push(`**Metrics:** ${metrics}`);
      if (tracing && tracing !== 'none') lines.push(`**Tracing:** ${tracing}`);
      if (errors  && errors  !== 'none') lines.push(`**Error Tracking:** ${errors}`);
      lines.push('');
    }
  }

  // ── Dev Process
  if (!skipped.has('version_control') || !skipped.has('code_quality') || !skipped.has('testing')) {
    const devLines = [];

    if (!skipped.has('version_control') && pt.phases.some(p => p.id === 'version_control')) {
      const branching = getAnswer('version_control', 'branching_strategy');
      const commits   = getAnswer('version_control', 'commit_convention');
      const hooks     = getAnswer('version_control', 'pre_commit_hooks');
      if (branching && branching !== 'none') devLines.push(`**Branching:** ${branching}`);
      if (commits   && commits   !== 'none') devLines.push(`**Commits:** ${commits}`);
      if (hooks     && hooks     !== 'none') devLines.push(`**Pre-commit Hooks:** ${hooks}`);
    }

    if (!skipped.has('code_quality') && pt.phases.some(p => p.id === 'code_quality')) {
      const linter = getAnswer('code_quality', 'linter');
      const sast   = getAnswer('code_quality', 'sast');
      const audit  = getAnswer('code_quality', 'dependency_audit');
      if (linter) devLines.push(`**Linter / Formatter:** ${linter}`);
      if (sast && sast !== 'none') devLines.push(`**SAST:** ${sast}`);
      if (audit !== null) devLines.push(`**Dependency Audit:** ${audit ? 'Yes' : 'No'}`);
    }

    if (!skipped.has('testing') && pt.phases.some(p => p.id === 'testing')) {
      const levels    = getAnswer('testing', 'levels');
      const coverage  = getAnswer('testing', 'coverage_threshold');
      const testRunner = getAnswer('testing', 'test_runner');
      if (levels && levels.length) devLines.push(`**Test Levels:** ${levels.join(', ')}`);
      if (testRunner) devLines.push(`**Test Runner:** ${testRunner}`);
      if (coverage)   devLines.push(`**Coverage Threshold:** ${coverage}%`);
    }

    if (devLines.length) {
      lines.push('## Dev Process');
      devLines.forEach(l => lines.push(l));
      lines.push('');
    }
  }

  // ── Documentation
  if (!skipped.has('documentation') && pt.phases.some(p => p.id === 'documentation')) {
    const readme   = getAnswer('documentation', 'readme');
    const apiDocs  = getAnswer('documentation', 'api_docs');
    const adr      = getAnswer('documentation', 'adr');
    const changelog = getAnswer('documentation', 'changelog');
    const hasDoc   = readme || (apiDocs && apiDocs !== 'none') || adr || (changelog && changelog !== 'none');
    if (hasDoc) {
      lines.push('## Documentation');
      if (readme !== null) lines.push(`**README Template:** ${readme ? 'Yes' : 'No'}`);
      if (apiDocs && apiDocs !== 'none') lines.push(`**API Docs:** ${apiDocs}`);
      if (adr !== null) lines.push(`**ADRs:** ${adr ? 'Yes' : 'No'}`);
      if (changelog && changelog !== 'none') lines.push(`**Changelog:** ${changelog}`);
      lines.push('');
    }
  }

  // ── Tool-specific footer note
  if (state.targetTool === 'Cursor') {
    lines.push('## Where to Start');
    const features = getAnswer('requirements', 'core_features');
    const mvp = getAnswer('requirements', 'mvp_scope');
    if (mvp === 'MVP' || mvp === 'prototype/demo') {
      lines.push('Start with the core MVP features only. Scaffold the project structure first, then implement:');
    } else {
      lines.push('Begin by scaffolding the project, then implement features in this order:');
    }
    if (features) {
      features.split('\n').filter(Boolean).slice(0, 5).forEach((f, i) => {
        lines.push(`${i + 1}. ${f.trim()}`);
      });
    }
    lines.push('');
  }

  if (state.targetTool === 'v0.dev') {
    lines.push('> **Note for v0.dev:** Focus on the UI component or page described above.');
    lines.push('> Provide component-level detail. v0 handles one page or component at a time.');
    lines.push('');
  }

  return lines.join('\n').trim();
}

function indentMultiline(text) {
  if (!text) return '';
  return text.split('\n')
    .filter(l => l.trim())
    .map(l => `  - ${l.trim()}`)
    .join('\n');
}

// ── Copy & Save ───────────────────────────────────────────────────────────
function stripMarkdown(md) {
  return md
    .replace(/^#{1,6}\s+/gm, '')           // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')        // bold
    .replace(/\*(.+?)\*/g, '$1')            // italic
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1') // inline/block code
    .replace(/^\s*[-*+]\s+/gm, '- ')        // list bullets (normalize)
    .replace(/^\s*>\s+/gm, '')              // blockquotes
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → label only
    .replace(/^[-*_]{3,}\s*$/gm, '---')     // horizontal rules
    .replace(/\n{3,}/g, '\n\n')             // collapse excess blank lines
    .trim();
}

document.getElementById('btn-copy-md').addEventListener('click', () => {
  const text = document.getElementById('prompt-output').textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => showToast('Copied as Markdown!'));
});

document.getElementById('btn-copy-txt').addEventListener('click', () => {
  const text = document.getElementById('prompt-output').textContent;
  if (!text) return;
  navigator.clipboard.writeText(stripMarkdown(text)).then(() => showToast('Copied as plain text!'));
});

document.getElementById('btn-save').addEventListener('click', () => {
  const text = document.getElementById('prompt-output').textContent;
  if (!text) return;
  const pt = PROJECT_TYPES.find(p => p.type === state.projectType);
  const projName = getAnswer('project_identity', 'name') || (pt ? pt.label : 'Untitled');
  const saved = getSavedPrompts();
  // Serialize extraTech Sets → plain arrays for JSON storage
  const extraTechSerialized = {};
  Object.entries(state.extraTech).forEach(([cat, set]) => {
    const arr = [...set].filter(Boolean);
    if (arr.length) extraTechSerialized[cat] = arr;
  });

  saved.unshift({
    id: Date.now(),
    title: projName,
    projectType: pt ? pt.label : '',
    targetTool: state.targetTool,
    content: text,
    date: new Date().toISOString(),
    stateSnapshot: {
      projectType: state.projectType,
      subtype: state.subtype,
      language: state.language,
      framework: state.framework,
      targetTool: state.targetTool,
      extraTech: extraTechSerialized,
      answers: { ...state.answers },
    },
  });
  localStorage.setItem('ppb_prompts', JSON.stringify(saved.slice(0, 50)));
  showToast('Saved!');
});

function showToast(msg = 'Copied to clipboard!') {
  const toast = document.getElementById('copy-toast');
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 2200);
}

// ── Browse Tab ────────────────────────────────────────────────────────────
function getSavedPrompts() {
  try { return JSON.parse(localStorage.getItem('ppb_prompts') || '[]'); }
  catch { return []; }
}

function renderBrowseTab() {
  const list = document.getElementById('saved-prompts-list');
  const saved = getSavedPrompts();
  list.innerHTML = '';
  if (!saved.length) {
    list.innerHTML = '<p class="no-saved">No saved prompts yet. Build one and click Save!</p>';
    return;
  }
  saved.forEach(item => {
    const card = document.createElement('div');
    card.className = 'saved-prompt-card';
    const date = new Date(item.date).toLocaleString();
    card.innerHTML = `
      <div class="saved-prompt-header">
        <div class="saved-prompt-meta">
          <span class="saved-prompt-title">${escHtml(item.title)}</span>
          ${item.projectType ? `<span class="phase-badge optional">${escHtml(item.projectType)}</span>` : ''}
          ${item.targetTool ? `<span class="phase-badge required">${escHtml(item.targetTool)}</span>` : ''}
          <span class="saved-prompt-date">${date}</span>
        </div>
        <div class="saved-prompt-actions">
          <button class="btn btn-ghost" data-id="${item.id}" data-action="copy-md">Markdown</button>
          <button class="btn btn-ghost" data-id="${item.id}" data-action="copy-txt">Text</button>
          <button class="btn btn-ghost" data-id="${item.id}" data-action="edit">Edit</button>
          <button class="btn btn-danger-ghost" data-id="${item.id}" data-action="delete">Delete</button>
        </div>
      </div>
      <div class="saved-prompt-body">${escHtml(item.content)}</div>
    `;
    card.querySelector('[data-action="copy-md"]').addEventListener('click', () => {
      navigator.clipboard.writeText(item.content).then(() => showToast('Copied as Markdown!'));
    });
    card.querySelector('[data-action="copy-txt"]').addEventListener('click', () => {
      navigator.clipboard.writeText(stripMarkdown(item.content)).then(() => showToast('Copied as plain text!'));
    });
    card.querySelector('[data-action="edit"]').addEventListener('click', () => {
      if (item.stateSnapshot) {
        loadStateIntoBuilder(item.stateSnapshot);
      }
    });
    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      const prompts = getSavedPrompts().filter(p => p.id !== item.id);
      localStorage.setItem('ppb_prompts', JSON.stringify(prompts));
      renderBrowseTab();
    });
    list.appendChild(card);
  });
}

document.getElementById('btn-clear-all').addEventListener('click', () => {
  if (confirm('Delete all saved prompts?')) {
    localStorage.removeItem('ppb_prompts');
    renderBrowseTab();
  }
});

// ── Load saved state back into the builder ────────────────────────────────
function loadStateIntoBuilder(snap) {
  // 1. Restore state
  state.projectType = snap.projectType || null;
  state.subtype     = snap.subtype     || '';
  state.language    = snap.language    || '';
  state.framework   = snap.framework   || '';
  state.targetTool  = snap.targetTool  || '';
  state.answers     = snap.answers     ? { ...snap.answers } : {};

  // Deserialize extraTech arrays → Sets
  state.extraTech = {};
  if (snap.extraTech) {
    Object.entries(snap.extraTech).forEach(([cat, arr]) => {
      state.extraTech[cat] = new Set(arr);
    });
  }

  // 2. Mark active project type in sidebar
  document.querySelectorAll('.project-type-item').forEach((el, i) => {
    el.classList.toggle('active', PROJECT_TYPES[i].type === state.projectType);
  });

  const pt = PROJECT_TYPES.find(p => p.type === state.projectType);
  if (!pt) return;

  // 3. Render top bar selects — they read from state internally
  renderTopBarSelects(pt);

  // 4. Force select values (renderTopBarSelects sets onchange but not .value for restored state)
  document.getElementById('sel-subtype').value = state.subtype;
  document.getElementById('sel-language').value = state.language;

  if (state.language) {
    populateFrameworkSelect(pt);
    document.getElementById('sel-framework').value = state.framework;
  }

  // 5. Target tool select + note
  const toolSel = document.getElementById('sel-target-tool');
  toolSel.value = state.targetTool;
  const cfg = TOOL_CONFIG[state.targetTool];
  const noteEl = document.getElementById('tool-note');
  if (cfg && cfg.note) { noteEl.textContent = cfg.note; noteEl.style.display = 'block'; }
  else { noteEl.style.display = 'none'; }

  // 6. Ecosystem panel (reads state.extraTech for pill highlighting)
  renderEcosystem();

  // 7. Phase sections — buildFieldGroup reads state.answers, so fields pre-fill automatically
  renderPhaseSections(pt);

  // 8. Regenerate prompt
  regeneratePrompt();

  // 9. Switch to the builder tab
  document.querySelectorAll('.tab').forEach(t => {
    const isBuilder = t.dataset.tab === 'builder';
    t.classList.toggle('active', isBuilder);
    t.setAttribute('aria-selected', isBuilder);
  });
  document.getElementById('tab-builder').style.display = 'flex';
  document.getElementById('tab-browse').style.display  = 'none';

  // 10. Scroll to top of content
  document.querySelector('.content-area').scrollTo({ top: 0, behavior: 'smooth' });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
