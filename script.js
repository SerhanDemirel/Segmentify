document.addEventListener('DOMContentLoaded', function() {
  const questionSection = document.getElementById('question-section');
  const productSection = document.getElementById('product-section');
  const backBtn = document.getElementById('back-btn');
  const nextBtn = document.getElementById('next-btn');
  const backBtnText = document.getElementById('back-btn-text');
  const nextBtnText = document.getElementById('next-btn-text');
  const stepIndicator = document.getElementById('step-indicator');
  const resetBtn = document.getElementById('reset-btn');

  let currentStep = 0;
  let selectedCategory = '';
  let selectedColor = '';
  let selectedPriceRange = '';

  // (1) Renk ve Kategori Map'lerini İngilizce => Türkçe olarak düzenliyoruz:
  const colorMap = {
    "black":  "siyah",
    "red":    "kırmızı",
    "green":  "yeşil",
    "blue":   "mavi",
    "white":  "beyaz",
    "beige":  "bej"
  };

  const categoryMap = {
    "dresses": [
      "elbise",
      "kadın > giyim > elbise",
      "kadın > giyim > üst & t-shirt",
      "erkek > giyim > üst & t-shirt",
      "giyim",
      "kadın > giyim > gece elbisesi"
    ],
    "clothing": [
      "giyim",
      "kadın > giyim > üst & t-shirt",
      "erkek > giyim > üst & t-shirt",
      "kadın > giyim > pantolon",
      "erkek > giyim > pantolon",
      "kadın > giyim > ceket",
      "erkek > giyim > ceket"
    ],
    "accessories": [
      "aksesuar",
      "aksesuar > iç giyim & çorap",
      "aksesuar > çanta",
      "aksesuar > takı",
      "aksesuar > şapka",
      "aksesuar > atkı",
      "aksesuar > eldiven"
    ]
  };

  fetch('questions.json')
    .then(resp => resp.json())
    .then(questions => {
      // Kadın sorularını aldığımızı varsayıyoruz, 0. index:
      const questionSet = questions[0];
      const steps = questionSet.steps;

      renderQuestion(steps, currentStep);
      updateStepIndicator(currentStep, steps.length);

      nextBtn.addEventListener('click', () => {
        if (validateSelection(steps[currentStep])) {
          currentStep++;
          if (currentStep < steps.length) {
            renderQuestion(steps, currentStep);
            updateStepIndicator(currentStep, steps.length);
          } else {
            // Sorular bitince ürünleri getir:
            fetch('products.json')
              .then(r => r.json())
              .then(products => {
                filterProducts(products);
              });
          }
        }
      });

      backBtn.addEventListener('click', () => {
        if (currentStep > 0) {
          currentStep--;
          renderQuestion(steps, currentStep);
          updateStepIndicator(currentStep, steps.length);
        }
      });
    });

  // Adım göstergesini güncelle
  function updateStepIndicator(current, total) {
    stepIndicator.textContent = `Step ${current + 1} / ${total}`;
  }

  // Soru render fonksiyonu
  function renderQuestion(steps, stepIndex) {
    const stepData = steps[stepIndex];
    let html = `<h2>${stepData.title}</h2>`;

    // Renk adımı (color)
    if (stepData.type === 'color') {
      html += `<div class="color-options">`;
      stepData.answers.forEach(answer => {
        // Ekranda göreceğimiz class ismi (siyah, kırmızı vb.)
        // ama question.json "Black" diye geliyorsa, biz .toLowerCase() ile map'e bakacağız
        const lowerAnswer = answer.toLowerCase();
        // Sınıf ismini UI'da da küçük yazabiliriz
        const colorClass = lowerAnswer;
        html += `
          <div class="color-option ${colorClass}" data-value="${answer}">
          </div>
        `;
      });
      html += `</div>`;
    } else {
      // Renk dışındaki adımlar (kategori, fiyat vb.)
      html += `<div class="options">`;
      stepData.answers.forEach(answer => {
        html += `
          <label class="option-label">
            <input type="radio" name="question" value="${answer}">
            ${answer}
          </label>
        `;
      });
      html += `</div>`;
    }

    questionSection.innerHTML = html;
    productSection.innerHTML = '';

    // Eğer renk adımıysa, tıklanılan rengi al:
    if (stepData.type === 'color') {
      const colorDivs = document.querySelectorAll('.color-option');
      colorDivs.forEach(div => {
        div.addEventListener('click', () => {
          colorDivs.forEach(d => d.style.borderColor = 'transparent');
          div.style.borderColor = '#333';
          selectedColor = div.getAttribute('data-value');
        });
      });
    }

    // Diğer adımlar için radio buton seçimi:
    if (stepData.type !== 'color') {
      const optionLabels = document.querySelectorAll('.option-label');
      optionLabels.forEach(label => {
        label.addEventListener('click', () => {
          optionLabels.forEach(l => l.classList.remove('selected'));
          label.classList.add('selected');
        });
      });
    }
  }

  // Seçim doğrulama
  function validateSelection(stepData) {
    if (!stepData) return false;

    const stepType = stepData.type;

    if (stepType === 'color') {
      if (!selectedColor) {
        alert('Lütfen bir renk seçin.');
        return false;
      }
      return true;
    } else {
      const selectedRadio = document.querySelector('input[name="question"]:checked');
      if (!selectedRadio) {
        alert('Lütfen bir seçim yapın.');
        return false;
      } else {
        // Hangi step'teyiz, değerleri kaydet
        if (stepType === 'question') {
          // Örn. category sorusu
          selectedCategory = selectedRadio.value;
        } else if (stepType === 'price') {
          selectedPriceRange = selectedRadio.value;
        }
        return true;
      }
    }
  }

  // Ürünleri filtreleyen fonksiyon
  function filterProducts(products) {
    const mappedCategories = categoryMap[selectedCategory.toLowerCase()] || [selectedCategory.toLowerCase()];
    const mappedColor = colorMap[selectedColor.toLowerCase()] || selectedColor.toLowerCase();

    console.log('Filtering Products with:', {
      selectedCategory,
      selectedColor,
      selectedPriceRange,
      mappedCategories,
      mappedColor
    });

    const filtered = products.filter(product => {
      const categoryMatch = mappedCategories.some(mappedCategory =>
        product.category.some(catItem =>
          catItem.toLowerCase().includes(mappedCategory)
        )
      );

      const colorMatch = product.colors.some(c =>
        c.toLowerCase() === mappedColor
      );

      const priceMatch = checkPriceRange(product.price, selectedPriceRange);

      return categoryMatch && colorMatch && priceMatch;
    });

    // Soru kısmını ve butonları kaldır
    questionSection.style.display = 'none';
    backBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    backBtnText.style.display = 'none';
    nextBtnText.style.display = 'none';
    resetBtn.style.display = 'block';

    if (filtered.length > 0) {
      renderProductsAsSlider(filtered);
    } else {
      console.log('No products matched the criteria.');
      productSection.innerHTML = '<p>No Product Found</p>';
    }
  }

  // Slider şeklinde ürünleri bas
  function renderProductsAsSlider(products) {
    productSection.innerHTML = `
      <div class="slider-container">
        <button class="slider-btn left" id="slider-prev">&#10094;</button>
        <div class="slider-wrapper" id="slider-wrapper">
          ${products.map(p => `
            <div class="slider-item product">
              <img src="${p.image}" alt="${p.name}" loading="lazy">
              <h3>${p.name}</h3>
              <p>${p.priceText}</p>
            </div>
          `).join('')}
        </div>
        <button class="slider-btn right" id="slider-next">&#10095;</button>
      </div>
    `;

    const sliderWrapper = document.getElementById('slider-wrapper');
    const sliderPrev = document.getElementById('slider-prev');
    const sliderNext = document.getElementById('slider-next');

    let currentTranslateX = 0;
    const itemWidth = 220; // Her ürün kutusunun genişliği
    const maxTranslateX = -(products.length - Math.floor(sliderWrapper.offsetWidth / itemWidth)) * itemWidth;

    sliderNext.addEventListener('click', () => {
      if (currentTranslateX > maxTranslateX) {
        currentTranslateX -= itemWidth;
        sliderWrapper.style.transform = `translateX(${currentTranslateX}px)`;
      }
    });

    sliderPrev.addEventListener('click', () => {
      if (currentTranslateX < 0) {
        currentTranslateX += itemWidth;
        sliderWrapper.style.transform = `translateX(${currentTranslateX}px)`;
      }
    });
  }

  // Seçili fiyat aralığına göre filtre fonksiyonu
  function checkPriceRange(productPrice, rangeValue) {
    // Örnek: "0-1000", "1000-2000", "2000+"
    // Kimisinde "₺" de olabilir => replace / trim
    let range = rangeValue.replace('₺','').trim();

    // "2000+" formatını ayıralım
    if (range.includes('+')) {
      // 2000+ gibi durum: alt sınır 2000, üst sınır sonsuz
      const val = parseFloat(range);
      return productPrice >= val;
    }

    // Normal durumda "min-max"
    let parts = range.split('-');
    if (parts.length === 2) {
      let min = parseFloat(parts[0]) || 0;
      let max = parseFloat(parts[1]) || Number.MAX_VALUE;
      return (productPrice >= min && productPrice <= max);
    } else {
      // Belki hiç sayı yoksa vs. 
      // Filtrelemeye takılmaz
      return true;
    }
  }
});