class EggWars {
    constructor() {
        this.dailyPrices = {};
        this.eggs = {
            'Large White Eggs': { min: 300, max: 500, space: 1, description: 'Standard large white eggs' },
            'Medium White Eggs': { min: 250, max: 400, space: 1, description: 'Standard medium white eggs' },
            'Cage-Free Large Brown Eggs': { min: 400, max: 600, space: 1, description: 'Cage-free brown eggs' },
            'Pasture-Raised Large Brown Eggs': { min: 500, max: 700, space: 1, description: 'Premium pasture-raised brown eggs' },
            'Organic Pasture-Raised Large Brown Eggs': { min: 600, max: 800, space: 1, description: 'Organic premium pasture-raised brown eggs' }
        };

        this.storeModifiers = {
            'Walmart': { risk: 0.2, priceModifier: 0.8, inventory: ['Large White Eggs', 'Medium White Eggs', 'Cage-Free Large Brown Eggs'] },
            'Target': { risk: 0.3, priceModifier: 1.0, inventory: ['Large White Eggs', 'Cage-Free Large Brown Eggs', 'Pasture-Raised Large Brown Eggs'] },
            'Costco': { risk: 0.4, priceModifier: 0.7, inventory: ['Large White Eggs', 'Cage-Free Large Brown Eggs', 'Organic Pasture-Raised Large Brown Eggs'] },
            'Sams Club': { risk: 0.3, priceModifier: 0.75, inventory: ['Large White Eggs', 'Cage-Free Large Brown Eggs', 'Organic Pasture-Raised Large Brown Eggs'] },
            'Kroger': { risk: 0.4, priceModifier: 1.1, inventory: ['Large White Eggs', 'Cage-Free Large Brown Eggs', 'Pasture-Raised Large Brown Eggs'] },
            'Trader Joes': { risk: 0.5, priceModifier: 1.2, inventory: ['Cage-Free Large Brown Eggs', 'Pasture-Raised Large Brown Eggs', 'Organic Pasture-Raised Large Brown Eggs'] }
        };

        this.stores = Object.keys(this.storeModifiers);

        this.events = [
            { name: 'Bird Flu Outbreak', type: 'bad', modifier: 1.5, category: 'multi-day', duration: 0, active: false },
            { name: 'Egg Theft', type: 'bad', modifier: 1.3, category: 'single-day', duration: 1, active: false },
            { name: 'Supply Chain Issues', type: 'bad', modifier: 1.2, category: 'multi-day', duration: 0, active: false },
            { name: 'Feed Price Increase', type: 'bad', modifier: 1.25, category: 'multi-day', duration: 0, active: false },
            { name: 'Egg Surplus', type: 'good', modifier: 0.7, category: 'multi-day', duration: 0, active: false },
            { name: 'New Farm Opens', type: 'good', modifier: 0.8, category: 'single-day', duration: 1, active: false },
            { name: 'Government Subsidy', type: 'good', modifier: 0.75, category: 'multi-day', duration: 0, active: false },
            { name: 'Viral Egg Trend', type: 'neutral', modifier: 1.1, category: 'multi-day', duration: 0, active: false },
            { name: 'Canadian Egg Import Tariffs Imposed', type: 'bad', modifier: 1.35, category: 'multi-day', duration: 0, active: false, followUp: 'Canadian Egg Import Tariffs Removed' },
            { name: 'Dutch Egg Import Tariffs Added', type: 'bad', modifier: 1.25, category: 'multi-day', duration: 0, active: false, followUp: 'Dutch Egg Tariffs Lifted' },
            { name: 'UK Egg Import Tariffs Implemented', type: 'bad', modifier: 1.2, category: 'multi-day', duration: 0, active: false, followUp: 'UK Egg Trade Agreement' },
            { name: 'Canadian Egg Import Tariffs Removed', type: 'good', modifier: 0.85, category: 'single-day', duration: 1, active: false },
            { name: 'Dutch Egg Tariffs Lifted', type: 'good', modifier: 0.9, category: 'single-day', duration: 1, active: false },
            { name: 'UK Egg Trade Agreement', type: 'good', modifier: 0.88, category: 'single-day', duration: 1, active: false }
        ];


        const savedState = localStorage.getItem('eggWarsState');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.player = state.player;
            this.currentDay = state.currentDay;
            this.activeEvents = state.activeEvents || [];
            this.dailyPrices = state.dailyPrices || {};
            
            // Restore event properties from the events array
            this.activeEvents = this.activeEvents.map(savedEvent => {
                const eventTemplate = this.events.find(e => e.name === savedEvent.name);
                const restoredEvent = { ...eventTemplate, ...savedEvent };
                
                // Recreate notification for active events
                if (restoredEvent.duration > 0) {
                    const notification = document.createElement('div');
                    notification.className = `notification event ${restoredEvent.type}`;
                    notification.setAttribute('role', 'alert');
                    notification.setAttribute('aria-live', 'polite');
                    
                    let description = '';
                    if (restoredEvent.type === 'bad') {
                        description = `Prices are increasing by ${Math.round((restoredEvent.modifier - 1) * 100)}% due to market disruption.`;
                    } else if (restoredEvent.type === 'good') {
                        description = `Prices are decreasing by ${Math.round((1 - restoredEvent.modifier) * 100)}% due to favorable conditions.`;
                    } else {
                        description = 'Market conditions are changing.';
                    }

                    notification.innerHTML = `
                        <div>
                            <span class="event-name">${restoredEvent.name}</span>
                            <div class="event-description">${description}</div>
                        </div>
                        <span class="event-duration" aria-label="Duration: ${restoredEvent.duration} days">${restoredEvent.duration} days</span>
                    `;
                    document.getElementById('notification-area').appendChild(notification);
                }
                
                return restoredEvent;
            });
            this.updateMarket(); // Update market prices with restored event modifiers
        } else {
            this.player = {
                cash: 5000,
                inventory: {},
                location: 'Walmart',
                inventorySpace: 100,
                usedSpace: 0
            };
            this.currentDay = 1;
            this.activeEvents = [];
        }

        this.maxDays = 30;
        this.initializeGame();
    }

    saveGameState() {
        const state = {
            player: this.player,
            currentDay: this.currentDay,
            activeEvents: this.activeEvents,
            dailyPrices: this.dailyPrices
        };
        // Ensure we're saving the complete state including daily prices
        if (!state.dailyPrices[this.currentDay]) {
            state.dailyPrices[this.currentDay] = {};
            Object.keys(this.eggs).forEach(type => {
                const egg = this.eggs[type];
                const basePrice = Math.floor(Math.random() * (egg.max - egg.min + 1)) + egg.min;
                state.dailyPrices[this.currentDay][type] = basePrice;
            });
        }
        localStorage.setItem('eggWarsState', JSON.stringify(state));
    }

    resetGame() {
        localStorage.removeItem('eggWarsState');
        location.reload();
    }

    buyEggs(eggType, price) {
        const spaceNeeded = this.eggs[eggType].space;
        if (this.player.usedSpace + spaceNeeded > this.player.inventorySpace) {
            this.showNotification("Not enough inventory space!", 'error');
            return;
        }

        if (this.player.cash >= price) {
            this.player.cash -= price;
            this.player.inventory[eggType] = (this.player.inventory[eggType] || 0) + 1;
            this.player.usedSpace += spaceNeeded;
            this.updateDisplay();
            this.saveGameState();
        } else {
            this.showNotification("Not enough cash!", 'error');
        }
    }

    sellEggs(eggType, price) {
        if (this.player.inventory[eggType] > 0) {
            this.player.cash += price;
            this.player.inventory[eggType]--;
            this.player.usedSpace -= this.eggs[eggType].space;
            this.updateDisplay();
            this.saveGameState();
        } else {
            this.showNotification("No eggs to sell!", 'error');
        }
    }

    setupEventListeners() {
        document.getElementById('reset-game').addEventListener('click', () => {
            this.resetGame();
        });

        const travelButton = document.getElementById('travel');
        const storeList = document.getElementById('store-list');

        travelButton.addEventListener('click', () => {
            const isExpanded = storeList.classList.contains('hidden');
            travelButton.setAttribute('aria-expanded', !isExpanded);
            
            // Special handling for Day 30
            if (this.currentDay === 30) {
                storeList.innerHTML = `<button onclick="game.endGame()" role="menuitem">END GAME</button>`;
            } else {
                storeList.innerHTML = this.stores
                    .map(store => `<button onclick="game.travelTo('${store}')" role="menuitem" ${store === this.player.location ? 'aria-current="true" disabled' : ''}>${store}${store === this.player.location ? ' (Current Location)' : ''}</button>`)
                    .join('');
            }
            storeList.classList.toggle('hidden');
        });
    }


    travelTo(newLocation) {
        if (this.stores.includes(newLocation)) {
            this.player.location = newLocation;
            this.currentDay++;
            if (this.currentDay > this.maxDays) {
                this.endGame();
                return;
            }
            document.getElementById('store-list').classList.add('hidden');

            // Update event durations and remove expired events
            const notificationArea = document.getElementById('notification-area');
            this.activeEvents = this.activeEvents.filter(event => {
                if (event.duration > 0) {
                    event.duration = event.duration - 1; // Ensure we only decrease by 1
                    if (event.duration === 0) {
                        // Remove the notification for expired events
                        const notifications = notificationArea.getElementsByClassName('notification');
                        for (let notification of notifications) {
                            if (notification.querySelector('.event-name')?.textContent === event.name) {
                                notification.remove();
                            }
                        }
                        return false;
                    }
                    // Update the duration display in notification
                    const notifications = notificationArea.getElementsByClassName('notification');
                    for (let notification of notifications) {
                        if (notification.querySelector('.event-name')?.textContent === event.name) {
                            const durationElement = notification.querySelector('.event-duration');
                            if (durationElement) {
                                durationElement.textContent = `${event.duration} days`;
                                durationElement.setAttribute('aria-label', `Duration: ${event.duration} days`);
                            }
                        }
                    }
                    return true;
                }
                return false;
            });

            this.updateMarket();
            this.updateDisplay();
            this.saveGameState();
            this.checkAndTriggerEvents();
        }
    }

    endGame() {
        // Auto-close the travel menu if it's open
        const storeList = document.querySelector('.store-list');
        if (storeList) {
            storeList.remove();
        }

        const finalScore = this.player.cash;
        const scoreValue = (finalScore/100).toFixed(2);
        let message = '';
        let icon = '';
        
        if (scoreValue >= 50) {
            message = '🏆 Egg-cellent Work! You\'re an Egg Tycoon!';
            icon = '🥚';
        } else if (scoreValue >= 10) {
            message = '👍 Not bad! You made a decent profit.';
            icon = '🥚';
        } else {
            message = '💔 Ouch! You barely survived in the egg market...';
            icon = '🍳';
        }
        
        const notification = document.createElement('div');
        notification.className = 'notification event game-over';
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        notification.innerHTML = `
            <div class="game-over-content">
                <button class="modal-close" onclick="this.closest('.notification').remove();">×</button>
                <div class="game-over-icon">${icon}</div>
                <div class="game-over-message">Game Over!</div>
                <div class="game-over-subtitle">${message}</div>
                <div class="final-score">Final Score: $${scoreValue}</div>
                <button class="play-again-btn" onclick="game.resetGame(); return false;">🔄 Play Again</button>
            </div>
        `;
        document.getElementById('notification-area').appendChild(notification);
    }

    updateDisplay() {
        document.getElementById('cash').textContent = `${(this.player.cash/100).toFixed(2)}`;
        document.getElementById('current-location').textContent = this.player.location;
        document.getElementById('day').textContent = this.currentDay;
        document.getElementById('inventory-space').textContent = `${this.player.usedSpace}/${this.player.inventorySpace}`;

        const inventoryList = document.getElementById('inventory-list');
        inventoryList.innerHTML = '';
        for (const [eggType, quantity] of Object.entries(this.player.inventory)) {
            if (quantity > 0) {
                const item = document.createElement('div');
                item.className = 'inventory-item';
                item.textContent = `${eggType}: ${quantity} dozen`;
                inventoryList.appendChild(item);
            }
        }
    }

    initializeGame() {
        this.updateMarket();
        this.setupEventListeners();
        this.updateDisplay();
        // Only check for new events if it's Day 1 and there are no active events
        if (this.currentDay === 1 && this.activeEvents.length === 0) {
            this.checkAndTriggerEvents();
        }
    }

    updateMarket() {
        const marketList = document.getElementById('market-list');
        marketList.innerHTML = '';
        
        const store = this.storeModifiers[this.player.location];
        if (!store || !store.inventory) {
            this.showNotification('Error: Store data not found', 'error');
            return;
        }
        
        const availableEggs = store.inventory;
        
        availableEggs.forEach(eggType => {
            if (!this.eggs[eggType]) {
                console.warn(`Warning: Egg type '${eggType}' not found in eggs data`);
                return;
            }
            const egg = this.eggs[eggType];
            // Generate or retrieve daily price
            if (!this.dailyPrices[this.currentDay]) {
                // Initialize prices for all egg types at once for consistency
                this.dailyPrices[this.currentDay] = {};
                Object.keys(this.eggs).forEach(type => {
                    const egg = this.eggs[type];
                    const basePrice = Math.floor(Math.random() * (egg.max - egg.min + 1)) + egg.min;
                    this.dailyPrices[this.currentDay][type] = basePrice;
                });
            }
            const finalPrice = Math.floor(this.dailyPrices[this.currentDay][eggType] * store.priceModifier);
            
            const eventModifier = this.calculateEventModifier();
            const modifiedPrice = Math.floor(finalPrice * eventModifier);
            
            const item = document.createElement('div');
            item.className = 'market-item';
            item.innerHTML = `
                <div class="item-name">🥚 ${eggType}</div>
                <div class="item-price">$${(modifiedPrice/100).toFixed(2)}/dozen</div>
                <div class="item-space">Space: ${egg.space}</div>
                <div class="item-description">${egg.description}</div>
                <div class="item-actions">
                    <button onclick="game.buyEggs('${eggType}', ${modifiedPrice})">Buy</button>
                    <button onclick="game.sellEggs('${eggType}', ${modifiedPrice})">Sell</button>
                </div>
            `;
            marketList.appendChild(item);
        });
    }

    updateDisplay() {
        document.getElementById('cash').textContent = `${(this.player.cash/100).toFixed(2)}`;
        document.getElementById('current-location').textContent = this.player.location;
        document.getElementById('day').textContent = this.currentDay;
        document.getElementById('inventory-space').textContent = `${this.player.usedSpace}/${this.player.inventorySpace}`;

        const inventoryList = document.getElementById('inventory-list');
        inventoryList.innerHTML = '';

        // Show all possible egg types, even if quantity is 0
        const allEggTypes = new Set([...Object.keys(this.eggs), ...Object.keys(this.player.inventory)]);
        
        allEggTypes.forEach(eggType => {
            const quantity = this.player.inventory[eggType] || 0;
            const item = document.createElement('div');
            item.className = `inventory-item ${quantity === 0 ? 'empty' : ''}`;
            item.textContent = `${eggType}: ${quantity} dozen`;
            inventoryList.appendChild(item);
        });
    }

    calculateEventModifier() {
        let modifier = 1;
        this.activeEvents.forEach(event => {
            modifier *= event.modifier;
        });
        return modifier;
    }

    checkAndTriggerEvents() {
        // Update existing events
        this.activeEvents = this.activeEvents.filter(event => {
            if (event.duration > 0) {
                return true; // Don't decrease duration here, it's handled in travelTo
            }
            return false;
        });

        // Chance to trigger new event if we have less than 2 active events
        if (this.activeEvents.length < 2 && Math.random() < 0.15) { // 15% chance each day
            const availableEvents = this.events.filter(event => 
                !this.activeEvents.some(activeEvent => 
                    activeEvent.name === event.name
                )
            );

            if (availableEvents.length > 0) {
                const newEvent = availableEvents[Math.floor(Math.random() * availableEvents.length)];
                const eventDuration = newEvent.category === 'multi-day' ? 
                    Math.floor(Math.random() * 5) + 3 : // 3-7 days for multi-day events
                    newEvent.duration;

                const activeEvent = { ...newEvent, duration: eventDuration };
                this.activeEvents.push(activeEvent);

                const notification = document.createElement('div');
                notification.className = `notification event ${newEvent.type}`;
                notification.setAttribute('role', 'alert');
                notification.setAttribute('aria-live', 'polite');
                
                let description = '';
                if (newEvent.type === 'bad') {
                    description = `Prices are increasing by ${Math.round((newEvent.modifier - 1) * 100)}% due to market disruption.`;
                } else if (newEvent.type === 'good') {
                    description = `Prices are decreasing by ${Math.round((1 - newEvent.modifier) * 100)}% due to favorable conditions.`;
                } else {
                    description = 'Market conditions are changing.';
                }

                notification.innerHTML = `
                    <div>
                        <span class="event-name">${newEvent.name}</span>
                        <div class="event-description">${description}</div>
                    </div>
                    <span class="event-duration" aria-label="Duration: ${eventDuration} days">${eventDuration} days</span>
                `;
                document.getElementById('notification-area').appendChild(notification);
            }
        }

        this.updateMarket();
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.getElementById('notification-area').appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new EggWars();
});