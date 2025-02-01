document.addEventListener('DOMContentLoaded', function() {
    const questionSection = document.getElementById('question-section');
    const productSection = document.getElementById('product-section');
    const backBtn = document.getElementById('back-btn');
    const nextBtn = document.getElementById('next-btn');
    const stepIndicator = document.getElementById('step-indicator');
  
    // Adımlar
    let currentStep = 0;
  
    // Seçilen değerler
    let selectedCategory = '';
    let selectedColor = '';
    let selectedPriceRange = '';
  
    // JSON dosyalarını paralel ya da sıralı çekebilirsiniz.
    // Burada önce question, sonra product çekiyoruz.
    fetch('questions.json')
      .then(resp => resp.json())
      .then(questions => {
        // Örnek olarak "kadın" question setini kullanalım.
        // Diğer setler için (erkek, çocuk, outlet) => .find(q => q.name === 'erkek') vs.
        const questionSet = questions.find(q => q.name === 'kadın');
        const steps = questionSet.steps;
  
        // İlk soruyu göster
        renderQuestion(steps, currentStep);
        updateStepIndicator(currentStep, steps.length);
  
        // Next butonuna tıklama
        nextBtn.addEventListener('click', () => {
          if (validateSelection(steps[currentStep])) {
            currentStep++;
            if (currentStep < steps.length) {
              // Bir sonraki soruyu göster
              renderQuestion(steps, currentStep);
              updateStepIndicator(currentStep, steps.length);
            } else {
              // Artık tüm sorular bitti, ürünleri filtrele
              fetch('products.json')
                .then(r => r.json())
                .then(products => {
                  filterProducts(products);
                });
            }
          }
        });
  
        // Back butonuna tıklama
        backBtn.addEventListener('click', () => {
          if (currentStep > 0) {
            currentStep--;
            renderQuestion(steps, currentStep);
            updateStepIndicator(currentStep, steps.length);
          }
        });
      });
  
    /**
     * Adım sayacını güncellemek için basit bir örnek fonksiyon
     */
    function updateStepIndicator(current, total) {
      // Örnek: "Step 2 / 3"
      stepIndicator.textContent = `Step ${current + 1} / ${total}`;
    }
  
    /**
     * Soruyu ekrana basan fonksiyon
     */
    function renderQuestion(steps, stepIndex) {
      const stepData = steps[stepIndex];
      let html = `<h2>${stepData.title}</h2>`;
  
      // "type" değerine göre farklı arayüz çiziyoruz.
      if (stepData.type === 'color') {
        // Renk seçenekleri dairesel
        html += `<div class="color-options">`;
        stepData.answers.forEach(answer => {
          // answer: "Black", "mavi", "siyah" vb.
          // class ismi vermek için harfleri küçük harfe çeviriyoruz
          const colorClass = answer
            .toLowerCase()
            .replace('ü','u').replace('ö','o').replace('ı','i')
            .replace('ş','s').replace('ç','c').replace('ğ','g');
          html += `
            <div class="color-option ${colorClass}" data-value="${answer}">
            </div>
          `;
        });
        html += `</div>`;
      } else {
        // Normal radio seçenekleri
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
      productSection.innerHTML = ''; // Yeni soruda ürün bölümünü temizle
  
      // Renk sorusu ise, dairelere click event'i atayalım
      if (stepData.type === 'color') {
        const colorDivs = document.querySelectorAll('.color-option');
        colorDivs.forEach(div => {
          div.addEventListener('click', () => {
            // Seçilen daireyi border ile belirtelim
            colorDivs.forEach(d => d.style.borderColor = 'transparent');
            div.style.borderColor = '#333';
  
            // Global renk değişkenine kaydediyoruz
            selectedColor = div.getAttribute('data-value');
          });
        });
      }
    }
  
    /**
     * Kullanıcı bir seçenek seçmiş mi kontrol ediyoruz.
     * Sorunun tipine göre seçimi kaydediyoruz.
     */
    function validateSelection(stepData) {
      const stepType = stepData.type;
  
      if (stepType === 'color') {
        // Renk seçimi var mı?
        if (!selectedColor) {
          alert('Lütfen bir renk seçin.');
          return false;
        }
        return true;
      } else {
        // Radio input
        const selectedRadio = document.querySelector('input[name="question"]:checked');
        if (!selectedRadio) {
          alert('Lütfen bir seçim yapın.');
          return false;
        } else {
          if (stepType === 'question') {
            // Örn. kategori seçimi
            selectedCategory = selectedRadio.value;
          } else if (stepType === 'price') {
            // Fiyat aralığı seçimi
            selectedPriceRange = selectedRadio.value;
          }
          return true;
        }
      }
    }
  
    /**
     * Ürünleri filtreleyen fonksiyon
     */
    function filterProducts(products) {
      // 1) Kategori eşleşmesi
      // 2) Renk eşleşmesi
      // 3) Fiyat aralığı
      const filtered = products.filter(product => {
        // Kategori kontrolü
        const categoryMatch = product.category.some(catItem => 
          catItem.toLowerCase().includes(selectedCategory.toLowerCase())
        );
  
        // Renk kontrolü (product.colors = ["mavi"] vs.)
        const colorMatch = product.colors.some(c => 
          c.toLowerCase() === selectedColor.toLowerCase()
        );
  
        // Fiyat kontrolü
        const priceMatch = checkPriceRange(product.price, selectedPriceRange);
  
        return categoryMatch && colorMatch && priceMatch;
      });
  
      // Ekrana basma (slider halinde)
      if (filtered.length > 0) {
        renderProductsAsSlider(filtered);
      } else {
        productSection.innerHTML = '<p>No Product Found</p>';
      }
    }
  
    /**
     * Filtrelenmiş ürünleri yatay slider içinde gösteren fonksiyon
     */
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
  
      // Slider kontrol elemanları
      const sliderWrapper = document.getElementById('slider-wrapper');
      const sliderPrev = document.getElementById('slider-prev');
      const sliderNext = document.getElementById('slider-next');
  
      // Kaydırma ile ilgili değişkenler
      let currentTranslateX = 0;
      // Ürün kartlarının genişliğini + aradaki boşluğu ayarlayarak test edebilirsiniz
      const itemWidth = 200; // Yaklaşık bir değer
  
      // Sağa (Next) kaydır
      sliderNext.addEventListener('click', () => {
        currentTranslateX -= itemWidth;
        sliderWrapper.style.transform = `translateX(${currentTranslateX}px)`;
      });
  
      // Sola (Prev) kaydır
      sliderPrev.addEventListener('click', () => {
        currentTranslateX += itemWidth;
        sliderWrapper.style.transform = `translateX(${currentTranslateX}px)`;
      });
    }
  
    /**
     * Fiyat aralığını parse eden fonksiyon.
     * Örnek: "€0-25", "€100+", "0-1000", "1000+"
     */
    function checkPriceRange(productPrice, rangeValue) {
      // Para birimi sembolü varsa temizleyelim ("€", "₺" vs.)
      let range = rangeValue.replace('€','').replace('₺','').trim();
  
      // "0-25", "25-50", "100+", "1000-2000", "2000+"
      let parts = range.split('-');
      // Eğer sadece "100+" gibi tek parça varsa, split = ["100+"]
      if (parts.length === 2) {
        // Örnek: "0" ve "25"
        let min = parseFloat(parts[0]) || 0;
        let max = parseFloat(parts[1]) || Number.MAX_VALUE;
        return (productPrice >= min && productPrice <= max);
      } else {
        // "+" içeren senaryo (ör. "25+", "2000+")
        let val = parseFloat(range);
        if (isNaN(val)) {
          return true; // Belirsiz durum, isterseniz false dönebilirsiniz
        }
        return (productPrice >= val);
      }
    }
  });
  