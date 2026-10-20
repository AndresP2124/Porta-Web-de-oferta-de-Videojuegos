/**
 * Módulo de Lógica de Cliente HTTP, Telemetría y Renderizado Dinámico
 * Asignatura: Diseño de Sistemas en Internet
 * Arquitectura de Interfaz: GameHost Deals Dashboard (CheapShark REST API v1.0)
 */

const API_CONFIG = {
    BASE_URL: "https://www.cheapshark.com/api/1.0",
    REDIRECT_URL: "https://www.cheapshark.com/redirect?dealID=",
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1200,
    DEFAULT_PAGE_SIZE: 12,
    INITIAL_QUERY: "Batman"
};

const appState = {
    storesMap: new Map(),
    isRequestInProgress: false
};

const domElements = {
    form: document.getElementById("deal-search-form"),
    inputTitle: document.getElementById("game-title"),
    selectStore: document.getElementById("store-select"),
    inputMaxPrice: document.getElementById("max-price"),
    btnSearch: document.getElementById("btn-search"),
    btnSimulateError: document.getElementById("btn-simulate-error"),
    categoryButtons: document.querySelectorAll(".category-btn"),
    // Elementos de Telemetría HTTP
    httpStatus: document.getElementById("http-status"),
    networkLatency: document.getElementById("network-latency"),
    retryCount: document.getElementById("retry-count"),
    asyncMethod: document.getElementById("async-method"),
    // Elementos de Notificación
    notificationArea: document.getElementById("status-notification"),
    notificationMessage: document.getElementById("notification-message"),
    // Elementos del Banner Hero Destacado (Recommended & Featured)
    featuredStoreTag: document.getElementById("featured-store-tag"),
    featuredBadge: document.getElementById("featured-badge"),
    featuredTitle: document.getElementById("featured-title"),
    featuredDesc: document.getElementById("featured-desc"),
    featuredRating: document.getElementById("featured-rating"),
    featuredNormalPrice: document.getElementById("featured-normal-price"),
    featuredSalePrice: document.getElementById("featured-sale-price"),
    featuredLink: document.getElementById("featured-link"),
    featuredImage: document.getElementById("featured-image"),
    // Elementos de la Cuadrícula de Catálogo (Most Popular)
    resultsCount: document.getElementById("results-count"),
    dealsGrid: document.getElementById("deals-grid")
};

/**
 * Pausa la ejecución de una función asíncrona mediante una Promesa controlada.
 * @param {number} ms - Tiempo de espera en milisegundos.
 * @returns {Promise<void>}
 */
function waitDelay(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
}

/**
 * Actualiza en tiempo real el módulo de telemetría HTTP en la barra lateral.
 * @param {Object} metrics - Parámetros de estado, latencia, reintentos y paradigma.
 */
function updateTelemetry(metrics) {
    if (metrics.statusText !== undefined) {
        domElements.httpStatus.textContent = metrics.statusText;
        domElements.httpStatus.className = "telemetry-badge " + (metrics.statusClass || "status-neutral");
    }
    if (metrics.latencyMs !== undefined) {
        domElements.networkLatency.textContent = metrics.latencyMs + " ms";
    }
    if (metrics.attempt !== undefined) {
        domElements.retryCount.textContent = metrics.attempt + " / " + API_CONFIG.MAX_RETRIES;
    }
    if (metrics.paradigm !== undefined) {
        domElements.asyncMethod.textContent = metrics.paradigm;
    }
}

/**
 * Muestra alertas informativas, de advertencia o de error en el área de trabajo.
 * @param {string} message - Texto descriptivo del evento.
 * @param {string} type - Clasificación ('info', 'warn', 'error').
 */
function showNotification(message, type) {
    domElements.notificationMessage.textContent = message;
    domElements.notificationArea.className = "notification-banner notification-" + type;
}

/**
 * Oculta el banner de notificaciones del área de trabajo.
 */
function hideNotification() {
    domElements.notificationArea.className = "notification-banner hidden";
    domElements.notificationMessage.textContent = "";
}

/**
 * Habilita o deshabilita controles interactivos para evitar condiciones de carrera.
 * @param {boolean} disabled - Estado booleano de bloqueo.
 */
function setControlsDisabled(disabled) {
    appState.isRequestInProgress = disabled;
    domElements.btnSearch.disabled = disabled;
    domElements.btnSimulateError.disabled = disabled;
    domElements.inputTitle.disabled = disabled;
    domElements.selectStore.disabled = disabled;
    domElements.inputMaxPrice.disabled = disabled;
    domElements.categoryButtons.forEach(function (btn) {
        btn.disabled = disabled;
    });
}

/**
 * Resuelve el nombre legible de una tienda digital a partir de su identificador.
 * @param {string|number} storeID - Identificador numérico de la tienda.
 * @returns {string} Nombre de la tienda.
 */
function getStoreName(storeID) {
    return appState.storesMap.get(String(storeID)) || ("Tienda ID #" + storeID);
}

/**
 * PARADIGMA 1: Promesas Tradicionales (.then / .catch)
 * Consulta el catálogo de tiendas activas en CheapShark y retorna una Promesa
 * para sincronizar el arranque del sistema.
 * @returns {Promise<void>}
 */
function loadStoresWithPromises() {
    const startTime = performance.now();
    const storesEndpoint = API_CONFIG.BASE_URL + "/stores";

    updateTelemetry({
        statusText: "Sincronizando",
        statusClass: "status-warn",
        attempt: 0,
        paradigm: "Promesas (.then)"
    });

    return fetch(storesEndpoint)
        .then(function (response) {
            const elapsedMs = Math.round(performance.now() - startTime);

            if (!response.ok) {
                updateTelemetry({
                    statusText: "HTTP " + response.status,
                    statusClass: "status-error",
                    latencyMs: elapsedMs
                });
                throw new Error("Código de estado HTTP no satisfactorio: " + response.status);
            }

            updateTelemetry({
                statusText: "HTTP " + response.status + " OK",
                statusClass: "status-ok",
                latencyMs: elapsedMs
            });

            return response.json();
        })
        .then(function (storesData) {
            const fragment = document.createDocumentFragment();

            storesData.forEach(function (store) {
                if (store.isActive === 1) {
                    appState.storesMap.set(String(store.storeID), store.storeName);

                    const optionElement = document.createElement("option");
                    optionElement.value = store.storeID;
                    optionElement.textContent = store.storeName;
                    fragment.appendChild(optionElement);
                }
            });

            domElements.selectStore.appendChild(fragment);
        })
        .catch(function (error) {
            const elapsedMs = Math.round(performance.now() - startTime);
            updateTelemetry({
                statusText: "Error Red",
                statusClass: "status-error",
                latencyMs: elapsedMs
            });
            showNotification(
                "Aviso en carga de tiendas con Promesas: " + error.message + ". Se utilizarán identificadores genéricos.",
                "warn"
            );
        });
}

/**
 * Motor central de peticiones HTTP con medición de latencia y algoritmo de
 * reintento automático con espera progresiva (Linear Backoff).
 * @param {string} url - Endpoint completo a consultar.
 * @returns {Promise<any>} Datos JSON devueltos por el servidor.
 */
async function fetchWithRetry(url) {
    let attempt = 0;

    while (attempt <= API_CONFIG.MAX_RETRIES) {
        const attemptStartTime = performance.now();

        try {
            if (attempt > 0) {
                updateTelemetry({
                    statusText: "Retry #" + attempt,
                    statusClass: "status-warn",
                    attempt: attempt
                });
            } else {
                updateTelemetry({
                    statusText: "Consultando",
                    statusClass: "status-warn",
                    attempt: 0
                });
            }

            const response = await fetch(url);
            const latencyMs = Math.round(performance.now() - attemptStartTime);

            if (!response.ok) {
                updateTelemetry({
                    statusText: "HTTP " + response.status,
                    statusClass: "status-error",
                    latencyMs: latencyMs,
                    attempt: attempt
                });

                const httpError = new Error("El servidor respondió con código de estado HTTP " + response.status);
                httpError.status = response.status;
                throw httpError;
            }

            const jsonData = await response.json();

            updateTelemetry({
                statusText: "HTTP " + response.status + " OK",
                statusClass: "status-ok",
                latencyMs: latencyMs,
                attempt: attempt
            });

            return jsonData;

        } catch (error) {
            const failLatencyMs = Math.round(performance.now() - attemptStartTime);

            if (!error.status) {
                updateTelemetry({
                    statusText: "Fallo de Red",
                    statusClass: "status-error",
                    latencyMs: failLatencyMs,
                    attempt: attempt
                });
            }

            if (attempt === API_CONFIG.MAX_RETRIES) {
                throw new Error(
                    "Se agotaron los " + API_CONFIG.MAX_RETRIES + " reintentos automáticos configurados. Detalle técnico: " + error.message
                );
            }

            attempt += 1;
            const currentDelay = API_CONFIG.RETRY_DELAY_MS * attempt;

            showNotification(
                "Anomalía detectada (" + error.message + "). Ejecutando reintento automático " + attempt + " de " + API_CONFIG.MAX_RETRIES + " en " + currentDelay + " ms...",
                "warn"
            );

            await waitDelay(currentDelay);
        }
    }
}

/**
 * Selecciona la oferta con mayor porcentaje de descuento de la colección y
 * actualiza dinámicamente los nodos del Banner Hero Destacado.
 * @param {Array<Object>} dealsList - Lista de ofertas obtenidas de la API.
 */
function updateFeaturedBanner(dealsList) {
    if (!Array.isArray(dealsList) || dealsList.length === 0) {
        domElements.featuredStoreTag.textContent = "Sin coincidencias";
        domElements.featuredBadge.textContent = "0% AHORRO";
        domElements.featuredTitle.textContent = "Ninguna oferta disponible para destacar";
        domElements.featuredDesc.textContent = "Modifique los parámetros de búsqueda o amplíe el límite de precio máximo en el panel lateral para obtener resultados.";
        domElements.featuredRating.textContent = "Valoración: N/A";
        domElements.featuredNormalPrice.textContent = "$0.00";
        domElements.featuredSalePrice.textContent = "$0.00 USD";
        domElements.featuredLink.href = "#";
        return;
    }

    // Algoritmo de selección del elemento óptimo por porcentaje de ahorro
    const bestDeal = dealsList.reduce(function (prev, current) {
        const prevSavings = parseFloat(prev.savings) || 0;
        const currSavings = parseFloat(current.savings) || 0;
        return currSavings > prevSavings ? current : prev;
    }, dealsList[0]);

    const savingsPercent = Math.round(parseFloat(bestDeal.savings) || 0);
    const storeName = getStoreName(bestDeal.storeID);
    const normalFormatted = "$" + parseFloat(bestDeal.normalPrice).toFixed(2);
    const saleFormatted = "$" + parseFloat(bestDeal.salePrice).toFixed(2) + " USD";

    domElements.featuredStoreTag.textContent = "Destacado en " + storeName;
    domElements.featuredBadge.textContent = "AHORRO DEL " + savingsPercent + "%";
    domElements.featuredTitle.textContent = bestDeal.title;
    domElements.featuredDesc.textContent =
        "Oferta verificada en tiempo real a través de " + storeName +
        ". Precio regular de catálogo reducido de " + normalFormatted + " USD a " + saleFormatted + ".";

    const steamRating = parseInt(bestDeal.steamRatingPercent, 10);
    const metaScore = parseInt(bestDeal.metacriticScore, 10);

    if (steamRating > 0) {
        domElements.featuredRating.textContent = "Steam Rating: " + steamRating + "% Positivo";
    } else if (metaScore > 0) {
        domElements.featuredRating.textContent = "Metacritic Score: " + metaScore + "/100";
    } else {
        domElements.featuredRating.textContent = "Oferta Verificada";
    }

    domElements.featuredNormalPrice.textContent = normalFormatted;
    domElements.featuredSalePrice.textContent = saleFormatted;
    domElements.featuredLink.href = API_CONFIG.REDIRECT_URL + encodeURIComponent(bestDeal.dealID);
    domElements.featuredImage.src = bestDeal.thumb;
    domElements.featuredImage.alt = "Arte promocional de " + bestDeal.title;
}

/**
 * Renderiza la cuadrícula de tarjetas de videojuegos construyendo nodos seguros
 * en el DOM y sincronizando a su vez el Banner Destacado superior.
 * @param {Array<Object>} dealsList - Colección de ofertas devueltas por CheapShark.
 */
function renderDeals(dealsList) {
    domElements.dealsGrid.textContent = "";

    const validList = Array.isArray(dealsList) ? dealsList : [];
    domElements.resultsCount.textContent = validList.length + " registros encontrados";

    // Actualizar primero el Banner Hero Superior con la mejor oferta detectada
    updateFeaturedBanner(validList);

    if (validList.length === 0) {
        const emptyParagraph = document.createElement("p");
        emptyParagraph.className = "empty-state";
        emptyParagraph.textContent = "No se localizaron ofertas en el catálogo para los filtros seleccionados.";
        domElements.dealsGrid.appendChild(emptyParagraph);
        return;
    }

    const gridFragment = document.createDocumentFragment();

    validList.forEach(function (deal) {
        const card = document.createElement("article");
        card.className = "deal-card";

        const thumbContainer = document.createElement("div");
        thumbContainer.className = "deal-thumb-container";

        const thumbImg = document.createElement("img");
        thumbImg.className = "deal-thumb";
        thumbImg.src = deal.thumb;
        thumbImg.alt = "Portada de " + deal.title;
        thumbImg.loading = "lazy";

        const savingsValue = Math.round(parseFloat(deal.savings) || 0);
        const savingsBadge = document.createElement("span");
        savingsBadge.className = "savings-badge";
        savingsBadge.textContent = "-" + savingsValue + "%";

        thumbContainer.appendChild(thumbImg);
        thumbContainer.appendChild(savingsBadge);

        const cardBody = document.createElement("div");
        cardBody.className = "deal-body";

        const titleHeading = document.createElement("h3");
        titleHeading.className = "deal-title";
        titleHeading.title = deal.title;
        titleHeading.textContent = deal.title;

        const metaRow = document.createElement("p");
        metaRow.className = "deal-meta";
        metaRow.textContent = getStoreName(deal.storeID);

        const pricesRow = document.createElement("div");
        pricesRow.className = "deal-prices";

        const normalPriceSpan = document.createElement("span");
        normalPriceSpan.className = "price-normal";
        normalPriceSpan.textContent = "$" + parseFloat(deal.normalPrice).toFixed(2);

        const salePriceSpan = document.createElement("span");
        salePriceSpan.className = "price-sale";
        salePriceSpan.textContent = "$" + parseFloat(deal.salePrice).toFixed(2);

        pricesRow.appendChild(normalPriceSpan);
        pricesRow.appendChild(salePriceSpan);

        cardBody.appendChild(titleHeading);
        cardBody.appendChild(metaRow);
        cardBody.appendChild(pricesRow);

        const cardFooter = document.createElement("div");
        cardFooter.className = "deal-footer";

        const scoreSpan = document.createElement("span");
        scoreSpan.className = "deal-score";
        const steamRating = parseInt(deal.steamRatingPercent, 10);
        const metaScore = parseInt(deal.metacriticScore, 10);

        if (steamRating > 0) {
            scoreSpan.textContent = "Steam: " + steamRating + "%";
        } else if (metaScore > 0) {
            scoreSpan.textContent = "Meta: " + metaScore;
        } else {
            scoreSpan.textContent = "Catálogo PC";
        }

        const dealLink = document.createElement("a");
        dealLink.className = "deal-link";
        dealLink.href = API_CONFIG.REDIRECT_URL + encodeURIComponent(deal.dealID);
        dealLink.target = "_blank";
        dealLink.rel = "noopener noreferrer";
        dealLink.textContent = "Ver Oferta";

        cardFooter.appendChild(scoreSpan);
        cardFooter.appendChild(dealLink);

        card.appendChild(thumbContainer);
        card.appendChild(cardBody);
        card.appendChild(cardFooter);

        gridFragment.appendChild(card);
    });

    domElements.dealsGrid.appendChild(gridFragment);
}

/**
 * PARADIGMA 2: Funciones Asíncronas (async / await)
 * Ejecuta la consulta parametrizada de ofertas hacia CheapShark API.
 * @param {string} searchTitle - Título del videojuego a consultar.
 */
async function executeDealsSearch(searchTitle) {
    if (appState.isRequestInProgress) {
        return;
    }

    const selectedStoreId = domElements.selectStore.value;
    const maxPrice = parseFloat(domElements.inputMaxPrice.value);

    hideNotification();
    setControlsDisabled(true);

    updateTelemetry({
        paradigm: "Async / Await",
        attempt: 0
    });

    const queryParams = new URLSearchParams({
        title: searchTitle,
        pageSize: String(API_CONFIG.DEFAULT_PAGE_SIZE)
    });

    if (selectedStoreId !== "") {
        queryParams.append("storeID", selectedStoreId);
    }

    if (!Number.isNaN(maxPrice) && maxPrice > 0) {
        queryParams.append("upperPrice", String(maxPrice));
    }

    const requestUrl = API_CONFIG.BASE_URL + "/deals?" + queryParams.toString();

    try {
        const dealsData = await fetchWithRetry(requestUrl);
        hideNotification();
        renderDeals(dealsData);
    } catch (error) {
        showNotification(error.message, "error");
        renderDeals([]);
    } finally {
        setControlsDisabled(false);
    }
}

/**
 * Manejador del evento submit en la barra superior de búsqueda.
 * @param {Event} event - Evento de formulario.
 */
function handleSearchSubmit(event) {
    event.preventDefault();

    const rawTitle = domElements.inputTitle.value.trim();

    if (rawTitle.length === 0) {
        showNotification("Validación de formulario: Ingrese el nombre de un videojuego en la barra superior.", "warn");
        domElements.inputTitle.focus();
        return;
    }

    // Desmarcar botones de categoría rápida cuando el usuario escribe una búsqueda personalizada
    domElements.categoryButtons.forEach(function (btn) {
        btn.classList.remove("active");
    });

    executeDealsSearch(rawTitle);
}

/**
 * Manejador de los botones de categorías rápidas en la barra lateral.
 * @param {Event} event - Evento de clic sobre el botón de categoría.
 */
function handleCategoryClick(event) {
    const clickedBtn = event.currentTarget;
    const categoryQuery = clickedBtn.getAttribute("data-query");

    if (!categoryQuery || appState.isRequestInProgress) {
        return;
    }

    domElements.categoryButtons.forEach(function (btn) {
        btn.classList.remove("active");
    });
    clickedBtn.classList.add("active");

    domElements.inputTitle.value = categoryQuery;
    executeDealsSearch(categoryQuery);
}

/**
 * Simulador académico de fallos HTTP para auditar el algoritmo de reintento.
 */
async function handleSimulateError() {
    if (appState.isRequestInProgress) {
        return;
    }

    setControlsDisabled(true);
    updateTelemetry({
        paradigm: "Async/Await (Retry)",
        attempt: 0
    });

    showNotification(
        "Iniciando simulación de fallo de transporte hacia un endpoint inexistente...",
        "info"
    );

    const invalidEndpointUrl = API_CONFIG.BASE_URL + "/recurso-invalido-simulacion-academica";

    try {
        await fetchWithRetry(invalidEndpointUrl);
    } catch (error) {
        showNotification("Prueba de resiliencia finalizada: " + error.message, "error");
    } finally {
        setControlsDisabled(false);
    }
}

/**
 * Inicialización coordinada del sistema:
 * 1. Carga el diccionario de tiendas con Promesas tradicionales (.then/.catch).
 * 2. Al resolverse, dispara automáticamente la carga inicial del catálogo con Async/Await.
 */
function initApplication() {
    domElements.form.addEventListener("submit", handleSearchSubmit);
    domElements.btnSimulateError.addEventListener("click", handleSimulateError);

    domElements.categoryButtons.forEach(function (btn) {
        btn.addEventListener("click", handleCategoryClick);
    });

    domElements.inputTitle.value = API_CONFIG.INITIAL_QUERY;

    loadStoresWithPromises().then(function () {
        executeDealsSearch(API_CONFIG.INITIAL_QUERY);
    });
}

document.addEventListener("DOMContentLoaded", initApplication);