const csInterface = new CSInterface();
let buttons = [];
let currentEditIndex = null;
let buttonSizes = {
    width: 100,
    height: 36,
    iconSize: 24, // This is for the icon display on the main buttons
    globalIconSize: 24 // This is for the default setting in "Manage Buttons"
};

let currentIcon = {
    data: null,
    color: 'white',
    displayMode: 'text',
    size: 24, // This refers to the icon size being configured in the form
    type: null
};

let selectedIconData = null;
let iconSearchState = {
    query: '',
    allIcons: [],
    displayedIcons: 0,
    batchSize: 50,
    isLoading: false
};

let collapsedSections = {};
let scriptEditor = null;
let textColor = 'white';
let showDescriptionInForm = true; // Renamed for clarity in form context

const CHECK_INTERVAL = 5 * 60 * 1000;
let checkIntervalId = null;
let lastCheckTime = null;
let lastCheckStatus = null;

const elements = {
    settingsButton: document.getElementById('settingsButton'),
    buttonsContainer: document.getElementById('buttonsContainer'),
    settingsModal: document.getElementById('settingsModal'),
    createButton: document.getElementById('createButton'),
    manageButtonsBtn: document.getElementById('manageButtonsBtn'),
    importExportBtn: document.getElementById('importExportBtn'),
    aboutBtn: document.getElementById('aboutBtn'), // New
    donateButton: document.getElementById('donateButton'), // New

    buttonForm: document.getElementById('buttonForm'),
    manageButtonsSection: document.getElementById('manageButtonsSection'),
    importExportSection: document.getElementById('importExportSection'),
    aboutSection: document.getElementById('aboutSection'), // New

    buttonName: document.getElementById('buttonName'),
    buttonSection: document.getElementById('buttonSection'), 
    buttonDescription: document.getElementById('buttonDescription'),
    showDescriptionToggle: document.getElementById('showDescriptionToggle'),
    saveButton: document.getElementById('saveButton'),
    cancelButton: document.getElementById('cancelButton'),
    
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    exportPluginSettingsCheckbox: document.getElementById('exportPluginSettings'), //New

    buttonsList: document.getElementById('buttonsList'),
    exportButtonsList: document.getElementById('exportButtonsList'),
    selectAllBtn: document.getElementById('selectAllBtn'),
    deselectAllBtn: document.getElementById('deselectAllBtn'),
    
    btnWidthSlider: document.getElementById('btnWidthSlider'),
    btnHeightSlider: document.getElementById('btnHeightSlider'),
    iconSizeSlider: document.getElementById('iconSizeSlider'), // In create/edit form
    globalIconSizeSlider: document.getElementById('globalIconSizeSlider'), // In manage buttons section

    btnWidthValue: document.getElementById('btnWidthValue'),
    btnHeightValue: document.getElementById('btnHeightValue'),
    iconSizeValue: document.getElementById('iconSizeValue'), // In create/edit form
    globalIconSizeValue: document.getElementById('globalIconSizeValue'), // In manage buttons section
    
    resetBtnWidth: document.getElementById('resetBtnWidth'),
    resetBtnHeight: document.getElementById('resetBtnHeight'),
    resetGlobalIconSize: document.getElementById('resetGlobalIconSize'),

    iconPreview: document.getElementById('iconPreview'),
    noIconText: document.getElementById('noIconText'),
    uploadIconBtn: document.getElementById('uploadIconBtn'),
    removeIconBtn: document.getElementById('removeIconBtn'),
    iconUpload: document.getElementById('iconUpload'),
    searchIconModalBtn: document.getElementById('searchIconModalBtn'),
    iconServiceStatus: document.getElementById('iconServiceStatus'),
    iconSearchModal: document.getElementById('iconSearchModal'),
    iconSearchInput: document.getElementById('iconSearchInput'),
    iconSearchResults: document.getElementById('iconSearchResults'),
    searchIconBtn: document.getElementById('searchIconBtn'), // In modal
    selectedIconPreview: document.getElementById('selectedIconPreview'),
    selectedIconId: document.getElementById('selectedIconId'),
    applyIconBtn: document.getElementById('applyIconBtn'),
    
    customAlert: document.getElementById('customAlert'),
    alertTitle: document.getElementById('alertTitle'),
    alertMessage: document.getElementById('alertMessage'),
    
    confirmModal: document.getElementById('confirmModal'),
    confirmTitle: document.getElementById('confirmTitle'),
    confirmMessage: document.getElementById('confirmMessage'),
    cancelConfirm: document.getElementById('cancelConfirm'),
    confirmConfirm: document.getElementById('confirmConfirm'),
    
    importSelectionModal: document.getElementById('importSelectionModal'),
    importSelectionTitle: document.getElementById('importSelectionTitle'),
    importSelectionList: document.getElementById('importSelectionList'),
    importSettingsOptionContainer: document.getElementById('importSettingsOptionContainer'),
    importApplyPluginSettingsCheckbox: document.getElementById('importApplyPluginSettings'),

    sectionEditContainer: document.getElementById('sectionEditContainer'),
    descriptionModal: document.getElementById('descriptionModal'),
    descriptionContent: document.getElementById('descriptionContent'),
    scriptEditorContainer: document.getElementById('scriptEditor'),
    sectionDropdownToggle: document.getElementById('sectionDropdownToggle'),
    sectionDropdownMenu: document.getElementById('sectionDropdownMenu'),
    sectionDropdownValue: document.getElementById('sectionDropdownValue'),
    selectAllForDelete: document.getElementById('selectAllForDelete'),
    deselectAllForDelete: document.getElementById('deselectAllForDelete'),
    deleteSelectedButtons: document.getElementById('deleteSelectedButtons'),
    closeDescriptionBtn: document.getElementById('closeDescriptionBtn'),
    newSectionInput: null 
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (typeof CSInterface === 'undefined') {
            console.warn('CSInterface not loaded. Running in browser mode or extension environment issue.');
        }
        
        initScriptEditor();
        loadButtons();
        loadSizes();
        loadCollapsedSections();
        setupEventListeners();
        renderButtons();
        updateGlobalButtonDisplaySizes(); 
        updateSectionDropdown(); 
        renderSectionEditControls();
        
        await checkIconService();
        startServiceCheckInterval();

        // Ensure "Create New Button" is the default active tab when settings are first opened
        // And the form is reset for creation.
        elements.createButton.click(); 
        
    } catch (error) {
        console.error('Initialization error:', error);
        showAlert('Initialization Failed', 
            `Failed to initialize: ${error.message}. Some features may not work.`,
            'error');
    }
});

function initScriptEditor() {
    if (elements.scriptEditorContainer) {
         scriptEditor = CodeMirror(elements.scriptEditorContainer, {
            value: '',
            mode: 'javascript',
            theme: 'dracula',
            lineNumbers: true,
            indentUnit: 4,
            tabSize: 4,
            matchBrackets: true,
            autoCloseBrackets: true,
            lineWrapping: true,
            extraKeys: {
                'Tab': 'indentMore',
                'Shift-Tab': 'indentLess'
            }
        });
        scriptEditor.setSize('100%', '150px'); 
    } else {
        console.error("scriptEditorContainer not found!");
    }
}

function loadCollapsedSections() {
    const saved = localStorage.getItem('aeCollapsedSections');
    if (saved) {
        try {
            collapsedSections = JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse collapsed sections:", e);
            collapsedSections = {};
        }
    }
}

function saveCollapsedSections() {
    localStorage.setItem('aeCollapsedSections', JSON.stringify(collapsedSections));
}

function loadSizes() {
    const savedSizes = localStorage.getItem('aeButtonSizes');
    if (savedSizes) {
        try {
            const sizes = JSON.parse(savedSizes);
            buttonSizes.width = sizes.width || 100;
            buttonSizes.height = sizes.height || 36;
            buttonSizes.iconSize = sizes.iconSize || 24; 
            buttonSizes.globalIconSize = sizes.globalIconSize || sizes.iconSize || 24; 
        } catch(e) {
            console.error("Failed to parse saved sizes:", e);
        }
    }
    elements.btnWidthSlider.value = buttonSizes.width;
    elements.btnHeightSlider.value = buttonSizes.height;
    elements.globalIconSizeSlider.value = buttonSizes.globalIconSize; 
    elements.iconSizeSlider.value = buttonSizes.iconSize; 

    elements.btnWidthValue.textContent = buttonSizes.width;
    elements.btnHeightValue.textContent = buttonSizes.height;
    elements.globalIconSizeValue.textContent = buttonSizes.globalIconSize;
    elements.iconSizeValue.textContent = buttonSizes.iconSize; 
}

function saveSizes() {
    localStorage.setItem('aeButtonSizes', JSON.stringify(buttonSizes));
}

function applySizesToMainPanelButtons() {
    document.querySelectorAll('.ae-button').forEach(btn => {
        btn.style.minWidth = `${buttonSizes.width}px`;
        btn.style.height = `${buttonSizes.height}px`;
        btn.style.padding = `8px ${Math.min(12, buttonSizes.width/10)}px`;
        
        const buttonDataId = btn.dataset.buttonId; 
        const matchingButton = buttons.find(b => b.name === (buttonDataId || btn.textContent.trim().split(" ")[0])); 

        const displayMode = matchingButton?.icon?.displayMode || 'text';
        const iconSizeToApply = matchingButton?.icon?.size || buttonSizes.iconSize; 


        if (btn.classList.contains('icon-only')) {
            btn.style.width = `${buttonSizes.height}px`; 
            btn.style.minWidth = 'auto';
        }
        
        const iconEl = btn.querySelector('.button-icon');
        if (iconEl) {
            iconEl.style.width = `${iconSizeToApply}px`;
            iconEl.style.height = `${iconSizeToApply}px`;
        }
    });
}

function updateGlobalButtonDisplaySizes() {
    elements.btnWidthValue.textContent = buttonSizes.width;
    elements.btnHeightValue.textContent = buttonSizes.height;
    elements.globalIconSizeValue.textContent = buttonSizes.globalIconSize;
    elements.btnWidthSlider.value = buttonSizes.width;
    elements.btnHeightSlider.value = buttonSizes.height;
    elements.globalIconSizeSlider.value = buttonSizes.globalIconSize;

    applySizesToMainPanelButtons(); 
    saveSizes();
}

function getUniqueSections() {
    const sections = new Set();
    buttons.forEach(btn => {
        if (btn.section) {
            sections.add(btn.section);
        }
    });
    return Array.from(sections).sort();
}

function updateSectionDropdown() {
    const sections = getUniqueSections();
    elements.sectionDropdownMenu.innerHTML = ''; 

    const newSectionInputContainer = document.createElement('div');
    newSectionInputContainer.className = 'section-dropdown-item';
    newSectionInputContainer.style.padding = '0';

    const newSectionInput = document.createElement('input');
    newSectionInput.type = 'text';
    newSectionInput.className = 'form-input';
    newSectionInput.placeholder = 'Create new section...';
    newSectionInput.style.width = 'calc(100% - 16px)';
    newSectionInput.style.margin = '8px';
    newSectionInput.style.boxSizing = 'border-box';

    newSectionInput.addEventListener('click', (e) => e.stopPropagation());
    newSectionInput.addEventListener('input', () => {
        const newName = newSectionInput.value.trim();
        elements.sectionDropdownValue.textContent = newName || 'Select or create section';
        elements.buttonSection.value = newName;
    });
    
    newSectionInputContainer.appendChild(newSectionInput);
    elements.sectionDropdownMenu.appendChild(newSectionInputContainer);
    elements.newSectionInput = newSectionInput; 
    
    const noSectionItem = document.createElement('div');
    noSectionItem.className = 'section-dropdown-item';
    noSectionItem.textContent = 'No section';
    noSectionItem.setAttribute('data-value', '');
    noSectionItem.addEventListener('click', () => {
        elements.sectionDropdownValue.textContent = 'No section';
        elements.buttonSection.value = '';
        if (elements.newSectionInput) elements.newSectionInput.value = ''; 
        elements.sectionDropdownMenu.classList.remove('show');
    });
    elements.sectionDropdownMenu.appendChild(noSectionItem);
    
    sections.forEach(section => {
        const item = document.createElement('div');
        item.className = 'section-dropdown-item';
        item.textContent = section;
        item.setAttribute('data-value', section);
        item.addEventListener('click', () => {
            elements.sectionDropdownValue.textContent = section;
            elements.buttonSection.value = section;
            if (elements.newSectionInput) elements.newSectionInput.value = ''; 
            elements.sectionDropdownMenu.classList.remove('show');
        });
        elements.sectionDropdownMenu.appendChild(item);
    });
}

function renderSectionEditControls() {
    elements.sectionEditContainer.innerHTML = '';
    const sections = getUniqueSections();
    
    if (sections.length === 0) {
        elements.sectionEditContainer.innerHTML = '<div style="color: var(--ae-text-color); opacity: 0.7;">No sections defined</div>';
        return;
    }
    
    sections.forEach(section => {
        const row = document.createElement('div');
        row.className = 'section-edit-row';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input section-select';
        input.value = section;
        
        const renameBtn = document.createElement('button');
        renameBtn.className = 'action-btn secondary-btn section-edit-btn';
        renameBtn.textContent = 'Rename';
        renameBtn.addEventListener('click', () => {
            const newName = input.value.trim();
            if (newName && newName !== section) {
                renameSection(section, newName);
            }
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn warning-btn section-edit-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
            showConfirm(
                'Delete Section',
                `Are you sure you want to delete section "${section}"? All buttons in this section will be moved to no section.`,
                () => deleteSection(section)
            );
        });
        
        row.appendChild(input);
        row.appendChild(renameBtn);
        row.appendChild(deleteBtn);
        elements.sectionEditContainer.appendChild(row);
    });
}

function renameSection(oldName, newName) {
    buttons.forEach(btn => {
        if (btn.section === oldName) btn.section = newName;
    });
    saveAndReRenderAll();
    showAlert('Success', `Section renamed from "${oldName}" to "${newName}"`, 'success');
}

function deleteSection(section) {
    buttons.forEach(btn => {
        if (btn.section === section) btn.section = '';
    });
    saveAndReRenderAll();
    showAlert('Success', `Section "${section}" deleted`, 'success');
}

function setupEventListeners() {
    elements.settingsButton.addEventListener('click', () => {
        elements.settingsModal.style.display = 'flex';
        // Default to "Create New Button" tab and ensure form is reset for it.
        resetButtonForm(); // Reset first
        switchToTab('create'); // Then switch
    });
    
    elements.sectionDropdownToggle.addEventListener('click', () => {
        elements.sectionDropdownMenu.classList.toggle('show');
    });
    
    document.addEventListener('click', (e) => {
        if (!elements.sectionDropdownToggle.contains(e.target) && 
            !elements.sectionDropdownMenu.contains(e.target)) {
            elements.sectionDropdownMenu.classList.remove('show');
        }
    });

    // Tab switching logic
    elements.createButton.addEventListener('click', () => {
        resetButtonForm(); // Reset form specifically for "Create New"
        switchToTab('create');
    });
    elements.manageButtonsBtn.addEventListener('click', () => switchToTab('manage'));
    elements.importExportBtn.addEventListener('click', () => switchToTab('importExport'));
    elements.aboutBtn.addEventListener('click', () => switchToTab('about'));
    
    elements.saveButton.addEventListener('click', saveButton);
    elements.cancelButton.addEventListener('click', () => {
        // No need to reset form here as per new flow, just switch tab.
        // If user was editing, the form might retain old data, but that's fine.
        // If they want to create new after cancel, they click "Create New Button" tab.
        switchToTab('manage'); 
    });
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const modal = btn.closest('.modal, .description-modal, .custom-alert, .confirm-modal, .import-selection-modal');
            if (modal) modal.style.display = 'none';
        });
    });

    elements.customAlert.querySelector('.alert-ok-btn').addEventListener('click', () => {
        elements.customAlert.style.display = 'none';
    });
    
    elements.closeDescriptionBtn.addEventListener('click', () => {
        elements.descriptionModal.style.display = 'none';
    });
    
    elements.exportBtn.addEventListener('click', exportButtons);
    elements.importBtn.addEventListener('click', () => elements.importFile.click());
    elements.importFile.addEventListener('change', handleImportFileSelect);
    
    elements.selectAllBtn.addEventListener('click', () => toggleExportCheckboxes(true));
    elements.deselectAllBtn.addEventListener('click', () => toggleExportCheckboxes(false));
    
    elements.selectAllForDelete.addEventListener('click', () => toggleManageCheckboxes(true));
    elements.deselectAllForDelete.addEventListener('click', () => toggleManageCheckboxes(false));
    elements.deleteSelectedButtons.addEventListener('click', handleDeleteSelectedButtons);
    
    elements.btnWidthSlider.addEventListener('input', (e) => {
        buttonSizes.width = parseInt(e.target.value);
        updateGlobalButtonDisplaySizes();
    });
    elements.btnHeightSlider.addEventListener('input', (e) => {
        buttonSizes.height = parseInt(e.target.value);
        updateGlobalButtonDisplaySizes();
    });
    elements.globalIconSizeSlider.addEventListener('input', (e) => {
        buttonSizes.globalIconSize = parseInt(e.target.value);
        buttonSizes.iconSize = buttonSizes.globalIconSize; 
        elements.iconSizeSlider.value = buttonSizes.iconSize; 
        elements.iconSizeValue.textContent = buttonSizes.iconSize;
        updateGlobalButtonDisplaySizes();
    });

    elements.resetBtnWidth.addEventListener('click', () => {
        buttonSizes.width = 100;
        updateGlobalButtonDisplaySizes();
    });
    elements.resetBtnHeight.addEventListener('click', () => {
        buttonSizes.height = 36;
        updateGlobalButtonDisplaySizes();
    });
    elements.resetGlobalIconSize.addEventListener('click', () => {
        buttonSizes.globalIconSize = 24;
        buttonSizes.iconSize = 24;
        elements.iconSizeSlider.value = 24;
        elements.iconSizeValue.textContent = 24;
        updateGlobalButtonDisplaySizes();
    });

    elements.iconSizeSlider.addEventListener('input', (e) => {
        currentIcon.size = parseInt(e.target.value);
        elements.iconSizeValue.textContent = currentIcon.size;
        updateIconPreviewInForm(); 
    });
    
    elements.uploadIconBtn.addEventListener('click', () => elements.iconUpload.click());
    elements.iconUpload.addEventListener('change', handleIconUpload);
    elements.removeIconBtn.addEventListener('click', removeIconFromForm);
    
    elements.searchIconModalBtn.addEventListener('click', openIconSearchModal);
    elements.searchIconBtn.addEventListener('click', searchAndDisplayIcons);
    elements.iconSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') elements.searchIconBtn.click();
    });
    elements.applyIconBtn.addEventListener('click', applySelectedIconToForm);
    
    document.querySelector('.close-icon-search-footer-btn').addEventListener('click', () => {
        elements.iconSearchModal.style.display = 'none';
    });
    document.querySelector('.icon-search-close-btn').addEventListener('click', () => {
        elements.iconSearchModal.style.display = 'none';
    });
    
    document.querySelectorAll('input[name="iconDisplay"]').forEach(radio => {
        radio.addEventListener('change', (e) => currentIcon.displayMode = e.target.value);
    });
    
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', (e) => {
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            e.target.classList.add('selected');
            currentIcon.color = e.target.getAttribute('data-color');
            if (currentIcon.data) updateIconPreviewInForm();
        });
    });
    
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.addEventListener('click', (e) => {
            document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('selected'));
            e.target.classList.add('selected');
        });
    });

    document.querySelectorAll('.text-color-option').forEach(option => {
        option.addEventListener('click', (e) => {
            document.querySelectorAll('.text-color-option').forEach(opt => opt.classList.remove('selected'));
            e.target.classList.add('selected');
            textColor = e.target.getAttribute('data-color');
        });
    });
    
    elements.cancelConfirm.addEventListener('click', () => elements.confirmModal.style.display = 'none');
    elements.showDescriptionToggle.addEventListener('change', (e) => showDescriptionInForm = e.target.checked);

    if (elements.donateButton) {
        elements.donateButton.addEventListener('click', () => {
            const donationLink = 'YOUR_MONOBANK_DONATION_LINK'; // REPLACE THIS
            if (donationLink === 'YOUR_MONOBANK_DONATION_LINK') {
                 showAlert('Info', 'Please replace placeholder donation link in the script.', 'info');
                 return;
            }
            if (csInterface && csInterface.openURLInDefaultBrowser) {
                csInterface.openURLInDefaultBrowser(donationLink);
            } else {
                window.open(donationLink, '_blank');
            }
        });
    }
}

function switchToTab(tabName) {
    elements.buttonForm.style.display = 'none';
    elements.manageButtonsSection.style.display = 'none';
    elements.importExportSection.style.display = 'none';
    elements.aboutSection.style.display = 'none';

    document.querySelectorAll('.main-control-btn').forEach(btn => btn.classList.remove('active'));

    if (tabName === 'create') {
        elements.buttonForm.style.display = 'block';
        elements.createButton.classList.add('active');
        // resetButtonForm(); // MOVED to createButton click listener
        if (scriptEditor) scriptEditor.refresh(); 
    } else if (tabName === 'manage') {
        elements.manageButtonsSection.style.display = 'block';
        elements.manageButtonsBtn.classList.add('active');
        renderButtonsList();
        renderSectionEditControls();
    } else if (tabName === 'importExport') {
        elements.importExportSection.style.display = 'block';
        elements.importExportBtn.classList.add('active');
        renderExportList();
    } else if (tabName === 'about') {
        elements.aboutSection.style.display = 'block';
        elements.aboutBtn.classList.add('active');
    }
}

function toggleExportCheckboxes(checkedState) {
    document.querySelectorAll('#exportButtonsList input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = checkedState;
    });
}
function toggleManageCheckboxes(checkedState) {
    document.querySelectorAll('#buttonsList input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = checkedState;
    });
    updateDeleteButtonState();
}

function handleDeleteSelectedButtons() {
    const selectedIndices = Array.from(document.querySelectorAll('#buttonsList input[type="checkbox"]:checked'))
                              .map(cb => parseInt(cb.getAttribute('data-index')));
    if (selectedIndices.length === 0) return;
    
    showConfirm(
        'Delete Buttons', 
        `Are you sure you want to delete ${selectedIndices.length} selected button(s)?`,
        () => {
            selectedIndices.sort((a, b) => b - a).forEach(index => buttons.splice(index, 1));
            saveAndReRenderAll();
            showAlert('Success', `${selectedIndices.length} button(s) deleted.`, 'success');
        }
    );
}

function updateDeleteButtonState() {
    const checkedCount = document.querySelectorAll('#buttonsList input[type="checkbox"]:checked').length;
    elements.deleteSelectedButtons.disabled = checkedCount === 0;
    elements.deleteSelectedButtons.textContent = checkedCount > 0 ? 
        `Delete Selected (${checkedCount})` : 'Delete Selected';
}

function openIconSearchModal() {
    if (elements.iconServiceStatus.classList.contains('status-error')) {
        showAlert('Service Unavailable', 
            'Icon search service is currently unavailable. Try again later or upload an icon manually.', 
            'error');
        return;
    }
    elements.iconSearchModal.style.display = 'flex';
    elements.iconSearchInput.focus();
}

async function searchAndDisplayIcons() {
    const query = elements.iconSearchInput.value.trim();
    if (!query) {
        showAlert('Warning', 'Please enter search query', 'warning');
        return;
    }

    iconSearchState = { query, allIcons: [], displayedIcons: 0, batchSize: 50, isLoading: true };
    elements.iconSearchResults.innerHTML = '<div class="loading-indicator">Searching icons...</div>';

    try {
        const response = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=200`); 
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        if (!data.icons || data.icons.length === 0) {
            elements.iconSearchResults.innerHTML = '<div class="loading-indicator">No icons found</div>';
            return;
        }

        iconSearchState.allIcons = data.icons;
        iconSearchState.displayedIcons = 0; 
        iconSearchState.isLoading = false;
        displayIconResultsBatch(); 

    } catch (error) {
        console.error('Search error:', error);
        elements.iconSearchResults.innerHTML = `<div class="loading-indicator" style="color: #ff4444;">Search failed: ${error.message}</div>`;
        iconSearchState.isLoading = false;
        checkIconService();
    }
}

function displayIconResultsBatch() {
    const resultsContainer = elements.iconSearchResults;
    if (iconSearchState.displayedIcons === 0) { 
        resultsContainer.innerHTML = ''; 
    }

    const fragment = document.createDocumentFragment();
    const endIndex = Math.min(iconSearchState.allIcons.length, iconSearchState.displayedIcons + iconSearchState.batchSize);

    for (let i = iconSearchState.displayedIcons; i < endIndex; i++) {
        const iconId = iconSearchState.allIcons[i];
        const iconElement = document.createElement('div');
        const iconName = iconId.split(':')[1] || iconId;
        iconElement.innerHTML = `
            <span class="iconify" data-icon="${iconId}" style="font-size: 48px; color: var(--ae-text-color)"></span>
            <div class="icon-result-name">${iconName}</div>`;
        
        iconElement.addEventListener('click', () => {
            document.querySelectorAll('#iconSearchResults > div.selected').forEach(el => el.classList.remove('selected'));
            iconElement.classList.add('selected');
            previewIconInSearchModal(iconId);
        });
        fragment.appendChild(iconElement);
    }
    resultsContainer.appendChild(fragment);
    iconSearchState.displayedIcons = endIndex;

    if (window.Iconify && window.Iconify.scan) window.Iconify.scan(resultsContainer);

    const oldLoadMoreBtn = resultsContainer.querySelector('.load-more-btn');
    if (oldLoadMoreBtn) oldLoadMoreBtn.remove();

    if (iconSearchState.displayedIcons < iconSearchState.allIcons.length) {
        addLoadMoreButtonToIconSearch();
    }
}

function addLoadMoreButtonToIconSearch() {
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.className = 'action-btn primary-btn load-more-btn';
    loadMoreBtn.style.gridColumn = '1 / -1';
    loadMoreBtn.style.margin = '10px auto';
    loadMoreBtn.textContent = 'Load More Icons';
    loadMoreBtn.addEventListener('click', () => {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<span class="loading-indicator">Loading...</span>';
        setTimeout(() => {
             displayIconResultsBatch();
        }, 100);
    });
    elements.iconSearchResults.appendChild(loadMoreBtn);
}

async function previewIconInSearchModal(iconId) {
    elements.selectedIconPreview.innerHTML = `<span class="iconify" data-icon="${iconId}" style="font-size: 64px; color: var(--ae-text-color)"></span>`;
    if (window.Iconify && window.Iconify.scan) window.Iconify.scan(elements.selectedIconPreview);
    elements.selectedIconId.textContent = iconId;
    elements.applyIconBtn.disabled = false;
    selectedIconData = { id: iconId }; 
    elements.iconSearchModal.querySelector('.icon-preview-container').style.display = 'block';
}

function applySelectedIconToForm() {
    if (!selectedIconData) return;
    
    const iconId = selectedIconData.id;
    
    try {
        if (!window.Iconify || !window.Iconify.getIcon) throw new Error('Iconify library not available');
        const iconRawData = window.Iconify.getIcon(iconId);
        if (!iconRawData) throw new Error('Failed to get icon data from Iconify');
        
        const svgBody = iconRawData.body;
        const width = iconRawData.width || 24;
        const height = iconRawData.height || 24;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${svgBody}</svg>`;
        
        const base64SVG = btoa(unescape(encodeURIComponent(svg)));
        const dataUrl = `data:image/svg+xml;base64,${base64SVG}`;
        
        currentIcon.data = dataUrl;
        currentIcon.type = 'svg'; 
        
        updateIconPreviewInForm();
        elements.removeIconBtn.style.display = 'block';
        elements.iconSearchModal.style.display = 'none';
        showAlert('Success', 'Icon applied successfully!', 'success');

    } catch (error) {
        console.error('Error applying icon:', error);
        showAlert('Error', `Failed to apply icon: ${error.message}`, 'error');
    }
}

function handleIconUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        currentIcon.data = e.target.result;
        currentIcon.type = file.type.includes('svg') ? 'svg' : 'png';
        updateIconPreviewInForm();
        elements.removeIconBtn.style.display = 'block';
    };
    reader.readAsDataURL(file);
    elements.iconUpload.value = ''; 
}

function updateIconPreviewInForm() {
    if (!currentIcon.data) {
        elements.iconPreview.src = ''; 
        elements.iconPreview.style.display = 'none';
        elements.noIconText.style.display = 'flex';
        return;
    }

    const colorValue = getComputedStyle(document.documentElement)
        .getPropertyValue(`--icon-${currentIcon.color}`).trim();
    
    const processAndDisplay = (dataUrl) => {
        elements.iconPreview.src = dataUrl;
        elements.iconPreview.style.display = 'block';
        elements.noIconText.style.display = 'none';
        elements.iconPreview.style.width = `${currentIcon.size * 1.5}px`; 
        elements.iconPreview.style.height = `${currentIcon.size * 1.5}px`;
    };

    if (currentIcon.type === 'svg') {
        applySvgColor(currentIcon.data, colorValue).then(processAndDisplay);
    } else if (currentIcon.type === 'png') {
        applyPngColor(currentIcon.data, colorValue).then(processAndDisplay);
    } else { 
        processAndDisplay(currentIcon.data); 
    }
}

function applySvgColor(svgData, color) {
    return new Promise((resolve) => {
        try {
            let svgText;
            if (svgData.startsWith('data:image/svg+xml;base64,')) {
                svgText = atob(svgData.split(',')[1]);
            } else if (svgData.startsWith('data:image/svg+xml,')) {
                svgText = decodeURIComponent(svgData.split(',')[1]);
            } else {
                svgText = svgData; 
                 try { svgText = atob(svgData); } catch(e) { /* was not base64 */ }
            }
            
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
            if (svgDoc.querySelector("parsererror")) {
                console.error("SVG parsing error:", svgDoc.querySelector("parsererror").textContent);
                resolve(svgData); return;
            }
            
            const svgElement = svgDoc.documentElement;
            function applyColorRecursive(element) {
                if (element.nodeType !== Node.ELEMENT_NODE) return;
                ['fill', 'stroke'].forEach(attr => {
                    if (element.hasAttribute(attr) && element.getAttribute(attr) !== 'none') {
                        element.setAttribute(attr, color);
                    }
                });
                if (element.hasAttribute('style')) {
                    let style = element.getAttribute('style');
                    style = style.replace(/fill\s*:\s*[^;"]*/g, `fill:${color}`)
                              .replace(/stroke\s*:\s*[^;"]*/g, `stroke:${color}`);
                    element.setAttribute('style', style);
                }
                const shapeTags = /^(path|rect|circle|ellipse|line|polyline|polygon)$/i;
                if (shapeTags.test(element.tagName) && !element.hasAttribute('fill') && !element.style.fill && element.getAttribute('fill') !== 'none') {
                    element.setAttribute('fill', color);
                }
                for (let child of element.children) applyColorRecursive(child);
            }
            if (svgElement.tagName.toLowerCase() === 'svg') {
                 if (!svgElement.querySelector('[fill],[stroke],[style*="fill"],[style*="stroke"]') &&
                    svgElement.getAttribute('fill') !== 'none' && !svgElement.style.fill) {
                    svgElement.setAttribute('fill', color);
                } else {
                    applyColorRecursive(svgElement);
                }
            }
            const serializer = new XMLSerializer();
            let coloredSvg = serializer.serializeToString(svgDoc); 
            if (!coloredSvg.toLowerCase().startsWith('<?xml')) {
                 coloredSvg = '<?xml version="1.0" encoding="UTF-8"?>' + coloredSvg;
            }
            resolve(`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(coloredSvg)))}`);
        } catch (error) {
            console.error('Error applying SVG color:', error, 'Original SVG:', svgData.substring(0,100));
            resolve(svgData); 
        }
    });
}

function applyPngColor(imageSrc, color) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL());
        };
        img.onerror = () => { resolve(imageSrc); }
        img.src = imageSrc;
    });
}

function removeIconFromForm() {
    currentIcon.data = null;
    currentIcon.type = null;
    updateIconPreviewInForm();
    elements.removeIconBtn.style.display = 'none';
    elements.iconUpload.value = '';
}

function loadButtons() {
    try {
        const savedButtons = localStorage.getItem('aeButtons');
        buttons = savedButtons ? JSON.parse(savedButtons) : [];
        buttons.forEach(btn => {
            if (typeof btn.showDescription === 'undefined') {
                btn.showDescription = true;
            }
        });
    } catch (error) {
        console.error('Failed to load buttons:', error);
        buttons = [];
        showAlert('Warning', 'Failed to load saved buttons. Starting with empty set.', 'warning');
    }
}

function saveButtons() {
    localStorage.setItem('aeButtons', JSON.stringify(buttons));
}

function renderButtons() { 
    elements.buttonsContainer.innerHTML = '';
    const sectionsMap = {};
    buttons.forEach(btn => {
        const sectionName = btn.section || ''; 
        if (!sectionsMap[sectionName]) sectionsMap[sectionName] = [];
        sectionsMap[sectionName].push(btn);
    });
    
    const sortedSectionNames = Object.keys(sectionsMap).sort((a, b) => {
        if (a === '') return -1; if (b === '') return 1; return a.localeCompare(b);
    });
    
    sortedSectionNames.forEach(sectionName => {
        if (sectionName) { 
            const divider = document.createElement('div');
            divider.className = `section-divider ${collapsedSections[sectionName] ? 'collapsed' : ''}`;
            divider.innerHTML = `<span>${sectionName}</span><span class="collapse-icon">▼</span>`;
            divider.addEventListener('click', () => {
                collapsedSections[sectionName] = !collapsedSections[sectionName];
                divider.classList.toggle('collapsed');
                saveCollapsedSections();
                const grid = divider.nextElementSibling;
                if (grid && grid.classList.contains('buttons-grid')) grid.classList.toggle('collapsed');
            });
            elements.buttonsContainer.appendChild(divider);
        }
        
        const grid = document.createElement('div');
        grid.className = `buttons-grid ${sectionName && collapsedSections[sectionName] ? 'collapsed' : ''}`;
        
        sectionsMap[sectionName].forEach((btnData) => { 
            const button = document.createElement('button');
            const shouldShowTooltip = btnData.description && btnData.showDescription !== false;
            
            button.className = 'ae-button';
            if (shouldShowTooltip) button.classList.add('tooltip');
            
            if (btnData.color && btnData.color !== 'default') {
                button.style.backgroundColor = btnData.color;
                button.style.borderColor = btnData.color; 
            }
            button.style.color = btnData.textColor === 'black' ? '#000000' : '#FFFFFF';
            
            const displayMode = btnData.icon?.displayMode || 'text';
            const iconSizeToUse = btnData.icon?.size || buttonSizes.iconSize; 
            const iconColor = btnData.icon?.color || 'white';
            
            if (shouldShowTooltip) {
                const tooltip = document.createElement('span');
                tooltip.className = 'tooltiptext';
                tooltip.textContent = btnData.description.length > 100 ? btnData.description.substring(0, 97) + "..." : btnData.description;
                button.appendChild(tooltip);
                
                const infoIcon = document.createElement('span');
                infoIcon.className = 'info-icon';
                infoIcon.textContent = 'i';
                infoIcon.title = "View full description";
                infoIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showButtonDescriptionModal(btnData.name, btnData.description);
                });
                button.appendChild(infoIcon);
            }
            
            if (btnData.icon?.data && (displayMode === 'icon' || displayMode === 'both')) {
                const iconEl = createButtonIconElement(btnData.icon, iconSizeToUse, iconColor);
                button.appendChild(iconEl);
                 if (displayMode === 'icon') button.classList.add('icon-only');
            }
            if (displayMode === 'text' || displayMode === 'both') {
                const textNode = document.createTextNode(displayMode === 'both' && btnData.icon?.data ? " " + btnData.name : btnData.name);
                button.appendChild(textNode);
            }
            
            button.addEventListener('click', () => executeScript(btnData.script));
            grid.appendChild(button);
        });
        elements.buttonsContainer.appendChild(grid);
    });
    applySizesToMainPanelButtons(); 
}

function createButtonIconElement(iconObj, size, colorName) {
    const icon = document.createElement('img');
    icon.className = 'button-icon';
    
    const colorValue = getComputedStyle(document.documentElement)
        .getPropertyValue(`--icon-${colorName}`).trim();
    
    if (iconObj.type === 'svg' && iconObj.data) {
        applySvgColor(iconObj.data, colorValue).then(coloredSvg => icon.src = coloredSvg);
    } else if (iconObj.type === 'png' && iconObj.data) {
        applyPngColor(iconObj.data, colorValue).then(coloredPng => icon.src = coloredPng);
    } else if (iconObj.data) { 
        icon.src = iconObj.data;
    } else {
        icon.alt = "icon"; 
    }
    
    icon.style.width = `${size}px`;
    icon.style.height = `${size}px`;
    return icon;
}

function showButtonDescriptionModal(title, description) {
    elements.descriptionModal.querySelector('.modal-title').textContent = `Description: ${title}`;
    elements.descriptionContent.textContent = description;
    elements.descriptionModal.style.display = 'flex';
}

function renderButtonsList() { 
    elements.buttonsList.innerHTML = '';
    buttons.forEach((btn, index) => {
        const item = document.createElement('div');
        item.className = 'button-item';
        item.setAttribute('draggable', 'true');
        item.setAttribute('data-index', index);
        
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
        
        const checkboxContainer = document.createElement('div');
        checkboxContainer.style.marginRight = '10px'; 
        checkboxContainer.innerHTML = `<input type="checkbox" id="mng-btn-${index}" data-index="${index}">`;
        checkboxContainer.querySelector('input').addEventListener('change', updateDeleteButtonState);
        
        const iconDisplay = document.createElement('span');
        iconDisplay.className = 'button-item-icon-display';
        iconDisplay.style.display = 'inline-flex'; 
        iconDisplay.style.alignItems = 'center';
        iconDisplay.style.marginRight = '8px';


        if (btn.icon?.data) {
            const iconEl = createButtonIconElement(btn.icon, 20, btn.icon.color || 'white'); 
            iconEl.style.marginRight = '5px';
            iconDisplay.appendChild(iconEl);
        }
        
        item.innerHTML = `
            <div class="move-buttons">
                <button class="move-btn move-up-btn" data-index="${index}" title="Move up">↑</button>
                <button class="move-btn move-down-btn" data-index="${index}" title="Move down">↓</button>
            </div>
            <div class="button-item-name">
                ${btn.name} ${btn.description && btn.showDescription !== false ? '<span title="Has description">ℹ️</span>' : ''}
                 <small style="opacity:0.7; margin-left: 5px;">(${btn.section || 'No Section'})</small>
            </div>
            <div class="button-actions">
                <button class="action-btn primary-btn small-btn edit-btn" data-index="${index}">Edit</button>
                <button class="action-btn warning-btn small-btn delete-btn" data-index="${index}">Delete</button>
            </div>
        `;
        
        item.insertBefore(checkboxContainer, item.querySelector('.move-buttons'));
        item.querySelector('.button-item-name').prepend(iconDisplay); 
        
        elements.buttonsList.appendChild(item);
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => editButton(parseInt(e.target.getAttribute('data-index')))));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => deleteButton(parseInt(e.target.getAttribute('data-index')))));
    document.querySelectorAll('.move-up-btn').forEach(btn => btn.addEventListener('click', (e) => moveButton(parseInt(e.target.getAttribute('data-index')), 'up')));
    document.querySelectorAll('.move-down-btn').forEach(btn => btn.addEventListener('click', (e) => moveButton(parseInt(e.target.getAttribute('data-index')), 'down')));
    
    updateDeleteButtonState();
}

let draggedItem = null;
function handleDragStart(e) {
    draggedItem = this; this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/html', this.innerHTML);
}
function handleDragOver(e) { e.preventDefault(); if (this !== draggedItem) this.classList.add('drag-over'); return false; }
function handleDragLeave() { this.classList.remove('drag-over'); }
function handleDrop(e) {
    e.stopPropagation(); e.preventDefault();
    try {
        if (this !== draggedItem) {
            this.classList.remove('drag-over');
            const fromIndex = parseInt(draggedItem.getAttribute('data-index'));
            const toIndex = parseInt(this.getAttribute('data-index'));
            if (isNaN(fromIndex) || isNaN(toIndex) || fromIndex < 0 || fromIndex >= buttons.length || toIndex < 0 || toIndex >= buttons.length) {
                throw new Error('Invalid drag indices');
            }
            const movedButton = buttons.splice(fromIndex, 1)[0];
            buttons.splice(toIndex, 0, movedButton);
            saveAndReRenderAll();
        }
    } catch (error) {
        console.error('Drag and drop error:', error);
        showAlert('Drag Error', 'Failed to reorder buttons. Please try again.', 'error');
        renderButtonsList(); 
    } finally {
         if (draggedItem) draggedItem.classList.remove('dragging');
         document.querySelectorAll('.button-item.drag-over').forEach(item => item.classList.remove('drag-over'));
         draggedItem = null;
    }
    return false;
}
function handleDragEnd() {
    if (draggedItem) draggedItem.classList.remove('dragging');
    document.querySelectorAll('.button-item.drag-over').forEach(item => item.classList.remove('drag-over'));
    draggedItem = null;
}

function moveButton(index, direction) {
    if (index < 0 || index >= buttons.length) return;
    const itemToMove = buttons[index];
    if (direction === 'up' && index > 0) {
        buttons.splice(index, 1);
        buttons.splice(index - 1, 0, itemToMove);
    } else if (direction === 'down' && index < buttons.length - 1) {
        buttons.splice(index, 1);
        buttons.splice(index + 1, 0, itemToMove);
    }
    saveAndReRenderAll();
    const buttonItems = document.querySelectorAll('.button-item');
    if (buttonItems[direction === 'up' ? Math.max(0, index-1) : Math.min(buttons.length-1, index+1)]) {
        buttonItems[direction === 'up' ? Math.max(0, index-1) : Math.min(buttons.length-1, index+1)].classList.add('moving');
        setTimeout(() => {
            buttonItems[direction === 'up' ? Math.max(0, index-1) : Math.min(buttons.length-1, index+1)]?.classList.remove('moving');
        }, 300);
    }
}

function renderExportList() {
    elements.exportButtonsList.innerHTML = '';
    buttons.forEach((btn, index) => {
        const container = document.createElement('div');
        container.className = 'checkbox-container';
        container.innerHTML = `
            <input type="checkbox" id="export-btn-${index}" data-index="${index}" checked>
            <label for="export-btn-${index}">${btn.name} (${btn.section || 'No Section'}) ${btn.icon?.data ? '🖼️' : ''} ${btn.description && btn.showDescription !== false ? 'ℹ️' : ''}</label>
        `;
        elements.exportButtonsList.appendChild(container);
    });
}

function editButton(index) {
    const btn = buttons[index];
    currentEditIndex = index;

    elements.buttonName.value = btn.name;
    elements.sectionDropdownValue.textContent = btn.section || 'No section';
    elements.buttonSection.value = btn.section || '';
    if (elements.newSectionInput) elements.newSectionInput.value = '';
    
    elements.buttonDescription.value = btn.description || '';
    elements.showDescriptionToggle.checked = btn.showDescription !== false; 
    showDescriptionInForm = elements.showDescriptionToggle.checked;

    scriptEditor.setValue(btn.script || '');
    
    if (btn.icon) {
        currentIcon = { ...btn.icon }; 
        elements.iconSizeSlider.value = currentIcon.size || buttonSizes.globalIconSize; 
        elements.iconSizeValue.textContent = elements.iconSizeSlider.value;
        currentIcon.size = parseInt(elements.iconSizeSlider.value); 

        document.querySelector(`input[name="iconDisplay"][value="${currentIcon.displayMode || 'text'}"]`).checked = true;
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.toggle('selected', opt.getAttribute('data-color') === (currentIcon.color || 'white'));
        });
        if (currentIcon.data) elements.removeIconBtn.style.display = 'block';
        else elements.removeIconBtn.style.display = 'none'; // Ensure remove button is hidden if no icon
    } else {
        removeIconFromForm(); 
        currentIcon.size = buttonSizes.globalIconSize; 
        elements.iconSizeSlider.value = currentIcon.size;
        elements.iconSizeValue.textContent = currentIcon.size;
    }
    updateIconPreviewInForm(); 
    
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.classList.toggle('selected', preset.getAttribute('data-color') === (btn.color || 'default'));
    });
    document.querySelectorAll('.text-color-option').forEach(option => {
        option.classList.toggle('selected', option.getAttribute('data-color') === (btn.textColor || 'white'));
    });
    textColor = btn.textColor || 'white';
    
    switchToTab('create'); 
    elements.buttonForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
        if (scriptEditor) scriptEditor.refresh()
    }, 50); 
}

function deleteButton(index) {
    showConfirm(
        'Delete Button', 
        `Are you sure you want to delete "${buttons[index].name}"?`,
        () => {
            buttons.splice(index, 1);
            saveAndReRenderAll();
            showAlert('Success', 'Button deleted successfully!', 'success');
        }
    );
}

function saveButton() {
    const name = elements.buttonName.value.trim();
    const section = elements.buttonSection.value.trim(); 
    const description = elements.buttonDescription.value.trim();
    const script = scriptEditor.getValue().trim();
    
    if (!name || !script) {
        showAlert('Error', 'Button name and script are required!', 'error');
        return;
    }
    
    const selectedColor = document.querySelector('.color-preset.selected')?.getAttribute('data-color') || 'default';
    const selectedTextColor = document.querySelector('.text-color-option.selected')?.getAttribute('data-color') || 'white';
    
    const buttonData = { 
        name, section, description,
        showDescription: showDescriptionInForm, 
        script,
        color: selectedColor !== 'default' ? selectedColor : undefined, 
        textColor: selectedTextColor,
        icon: currentIcon.data ? { ...currentIcon } : null 
    };
    if (buttonData.icon) {
        buttonData.icon.size = parseInt(elements.iconSizeSlider.value);
    }
    
    if (currentEditIndex !== null) {
        buttons[currentEditIndex] = buttonData;
    } else {
        buttons.push(buttonData);
    }
    
    saveAndReRenderAll();
    showAlert('Success', `Button ${currentEditIndex !== null ? 'updated' : 'created'} successfully!`, 'success');
    switchToTab('manage'); 
}

function resetButtonForm() {
    elements.buttonName.value = '';
    elements.sectionDropdownValue.textContent = 'Select or create section';
    elements.buttonSection.value = '';
    if (elements.newSectionInput) elements.newSectionInput.value = '';
    elements.buttonDescription.value = '';
    elements.showDescriptionToggle.checked = true;
    showDescriptionInForm = true;
    if (scriptEditor) scriptEditor.setValue('');
    currentEditIndex = null;
    
    currentIcon = {
        data: null, color: 'white', displayMode: 'text', 
        size: buttonSizes.globalIconSize, 
        type: null
    };
    elements.iconSizeSlider.value = buttonSizes.globalIconSize; 
    elements.iconSizeValue.textContent = buttonSizes.globalIconSize;

    document.querySelector('input[name="iconDisplay"][value="text"]').checked = true;
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.toggle('selected', opt.dataset.color === 'white'));
    document.querySelectorAll('.color-preset').forEach(preset => preset.classList.toggle('selected', preset.dataset.color === 'default'));
    document.querySelectorAll('.text-color-option').forEach(opt => opt.classList.toggle('selected', opt.dataset.color === 'white'));
    textColor = 'white';
    
    removeIconFromForm(); 
    if (scriptEditor) setTimeout(() => scriptEditor.refresh(), 0); 
}

function exportButtons() {
    try {
        const checkboxes = document.querySelectorAll('#exportButtonsList input[type="checkbox"]:checked');
        if (checkboxes.length === 0) {
            showAlert('Warning', 'Please select at least one button to export!', 'warning');
            return;
        }

        const buttonsToExport = Array.from(checkboxes).map(cb => buttons[parseInt(cb.getAttribute('data-index'))]);
        const exportData = { buttons: buttonsToExport, exportedAt: new Date().toISOString(), version: "1.1" };

        if (elements.exportPluginSettingsCheckbox.checked) {
            exportData.pluginSettings = { buttonSizes: { ...buttonSizes } }; 
        }

        const jsonData = JSON.stringify(exportData, null, 2);
        const escapedJsonData = jsonData.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
        const jsx = `var d='${escapedJsonData}'; var f=File.saveDialog('Save buttons as','*.json'); if(f){f.encoding='UTF-8';f.open('w');f.write(d);f.close();true;}else{false;}`;
        
        if (csInterface && csInterface.evalScript) {
            csInterface.evalScript(jsx, (result) => {
                if (result === "true") showAlert('Success', 'Data exported successfully!', 'success');
                else if (result === "false") showAlert('Info', 'Export cancelled by user.', 'info');
                else showAlert('Warning', 'Export status unknown or script error.', 'warning');
            });
        } else {
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ae_buttons_export.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showAlert('Success', 'Data downloaded (browser mode).', 'success');
        }

    } catch (error) {
        console.error('Export error:', error);
        showAlert('Error', 'Export failed: ' + error.message, 'error');
    }
}

function handleImportFileSelect(event) { 
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            if (!e.target.result.trim()) throw new Error('File is empty');
            const data = JSON.parse(e.target.result);
            if (!data.buttons || !Array.isArray(data.buttons)) throw new Error('Invalid format: missing "buttons" array');
            
            elements.importSelectionList.innerHTML = '';
            data.buttons.forEach((btn, index) => {
                const container = document.createElement('div');
                container.className = 'checkbox-container';
                container.innerHTML = `
                    <input type="checkbox" id="import-sel-btn-${index}" data-index="${index}" checked>
                    <label for="import-sel-btn-${index}">${btn.name} (${btn.section || 'No Section'})</label>`;
                elements.importSelectionList.appendChild(container);
            });

            if (data.pluginSettings && data.pluginSettings.buttonSizes) {
                elements.importSettingsOptionContainer.style.display = 'flex';
                elements.importApplyPluginSettingsCheckbox.checked = true; 
            } else {
                elements.importSettingsOptionContainer.style.display = 'none';
                elements.importApplyPluginSettingsCheckbox.checked = false;
            }
            
            elements.importSelectionModal.style.display = 'flex';
            
            const newSelectAll = elements.importSelectionModal.querySelector('.select-all-import').cloneNode(true);
            elements.importSelectionModal.querySelector('.select-all-import').replaceWith(newSelectAll);
            newSelectAll.addEventListener('click', () => elements.importSelectionList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true));

            const newDeselectAll = elements.importSelectionModal.querySelector('.deselect-all-import').cloneNode(true);
            elements.importSelectionModal.querySelector('.deselect-all-import').replaceWith(newDeselectAll);
            newDeselectAll.addEventListener('click', () => elements.importSelectionList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false));
            
            const newCancel = elements.importSelectionModal.querySelector('.cancel-import').cloneNode(true);
            elements.importSelectionModal.querySelector('.cancel-import').replaceWith(newCancel);
            newCancel.addEventListener('click', () => elements.importSelectionModal.style.display = 'none');

            const newConfirm = elements.importSelectionModal.querySelector('.confirm-import').cloneNode(true);
            elements.importSelectionModal.querySelector('.confirm-import').replaceWith(newConfirm);
            newConfirm.addEventListener('click', () => {
                const selectedIndices = Array.from(elements.importSelectionList.querySelectorAll('input[type="checkbox"]:checked'))
                                          .map(cb => parseInt(cb.getAttribute('data-index')));
                if (selectedIndices.length === 0) {
                    showAlert('Warning', 'Please select at least one button to import!', 'warning'); return;
                }
                
                selectedIndices.forEach(index => {
                    const importedBtn = data.buttons[index];
                    if (typeof importedBtn.showDescription === 'undefined') {
                        importedBtn.showDescription = true;
                    }
                    buttons.push(importedBtn);
                });
                
                let settingsApplied = false;
                if (elements.importApplyPluginSettingsCheckbox.checked && data.pluginSettings && data.pluginSettings.buttonSizes) {
                    buttonSizes = { ...data.pluginSettings.buttonSizes };
                    updateGlobalButtonDisplaySizes(); 
                    settingsApplied = true;
                }
                
                saveAndReRenderAll();
                elements.importSelectionModal.style.display = 'none';
                showAlert('Success', `Imported ${selectedIndices.length} buttons. ${settingsApplied ? 'Plugin settings also applied.' : ''}`, 'success');
            });

        } catch (error) {
            console.error('Import error:', error);
            showAlert('Error', 'Import failed: ' + error.message, 'error');
        } finally {
             event.target.value = ''; 
        }
    };
    reader.onerror = () => showAlert('Error', 'Failed to read file', 'error');
    reader.readAsText(file);
}

function executeScript(script) {
    if (!script || script.trim() === '') {
        showAlert('Error', 'Script is empty', 'error'); return;
    }
    if (csInterface && csInterface.evalScript) {
        csInterface.evalScript(script, (result) => {
            if (result === undefined || result === null || String(result).trim() === "") return;
            if (typeof result === 'string' && result.toLowerCase().startsWith('error:')) {
                showAlert('Script Error', result, 'error');
            } else if (result) {
                console.log('Script result:', result); 
            }
        });
    } else {
         console.warn("evalScript called in browser mode. Script: ", script);
         showAlert('Info', 'Script execution simulated (browser mode). Check console.', 'info');
    }
}

function showAlert(title, message, type = 'info') {
    const colors = { info: 'var(--ae-accent-color)', warning: 'var(--ae-warning-color)', error: '#ff4444', success: 'var(--ae-success-color)' };
    elements.alertTitle.textContent = title;
    elements.alertTitle.style.color = colors[type] || colors.info;
    elements.alertMessage.textContent = message;
    elements.customAlert.style.display = 'flex';
}

function showConfirm(title, message, confirmCallback, cancelCallback) {
    elements.confirmTitle.textContent = title;
    elements.confirmMessage.textContent = message;
    
    const newConfirmBtn = elements.confirmConfirm.cloneNode(true);
    elements.confirmConfirm.parentNode.replaceChild(newConfirmBtn, elements.confirmConfirm);
    elements.confirmConfirm = newConfirmBtn;
    
    const newCancelBtn = elements.cancelConfirm.cloneNode(true);
    elements.cancelConfirm.parentNode.replaceChild(newCancelBtn, elements.cancelConfirm);
    elements.cancelConfirm = newCancelBtn;

    elements.confirmConfirm.onclick = () => { 
        if(confirmCallback) confirmCallback();
        elements.confirmModal.style.display = 'none';
    };
    elements.cancelConfirm.onclick = () => {
        if(cancelCallback) cancelCallback();
        elements.confirmModal.style.display = 'none';
    };
    elements.confirmModal.style.display = 'flex';
}

async function checkIconService() {
    const statusDot = elements.iconServiceStatus;
    statusDot.className = 'status-dot status-loading';
    statusDot.setAttribute('data-tooltip', 'Checking service status...');
    lastCheckTime = new Date();
    
    try {
        if (typeof Iconify === 'undefined' || typeof Iconify.scan !== 'function') {
            throw new Error('Iconify library not loaded');
        }
        const response = await fetch('https://api.iconify.design/collections.json', { method: 'HEAD', cache: 'no-cache' });
        if (response.ok) {
            statusDot.className = 'status-dot status-ok';
            statusDot.setAttribute('data-tooltip', `Service available\nLast checked: ${lastCheckTime.toLocaleTimeString()}`);
            lastCheckStatus = true;
        } else {
            throw new Error(`Service unavailable (HTTP ${response.status})`);
        }
    } catch (error) {
        console.error('Service check error:', error);
        statusDot.className = 'status-dot status-error';
        statusDot.setAttribute('data-tooltip', `Service check failed: ${error.message}\nLast checked: ${lastCheckTime.toLocaleTimeString()}`);
        lastCheckStatus = false;
    }
    return lastCheckStatus;
}

function startServiceCheckInterval() {
    if (checkIntervalId) clearInterval(checkIntervalId);
    checkIntervalId = setInterval(checkIconService, CHECK_INTERVAL);
}

function saveAndReRenderAll() {
    saveButtons();
    renderButtons(); 
    renderButtonsList(); 
    renderExportList(); 
    updateSectionDropdown();
    renderSectionEditControls();
}
