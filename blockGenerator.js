class BlockGenerator {
    constructor() {
        this.colors = ['red', 'blue', 'green', 'yellow', 'purple'];
        this.container = document.getElementById('blocksGenerator');
        this.generatedBlocks = [];
        this.blockSize = 40;
        
        // Определяем типы блоков (теперь только большие блоки)
        this.blockTypes = [
            { shape: [[1, 1]], size: 2 },  // горизонтальный из 2
            { shape: [[1, 1, 1]], size: 3 },  // горизонтальный из 3
            { shape: [[1, 1, 1, 1]], size: 4 },  // горизонтальный из 4
            { shape: [[1, 1, 1, 1, 1]], size: 5 },  // горизонтальный из 5
            { shape: [[1, 1, 1, 1, 1, 1]], size: 6 }  // горизонтальный из 6
        ];
    }

    generateBlocks(count = 3) {
        this.generatedBlocks = [];
        this.container.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const block = document.createElement('div');
            const color = this.getRandomColor();
            const blockType = this.getRandomBlockType();
            
            block.className = `block ${color} pop-in`;
            block.dataset.color = color;
            block.dataset.shape = JSON.stringify(blockType.shape);
            
            // Устанавливаем размер блока в зависимости от его типа
            block.style.width = `${this.blockSize * blockType.shape[0].length}px`;
            block.style.height = `${this.blockSize}px`;
            
            // Создаем внутренние части блока
            for (let j = 0; j < blockType.shape[0].length; j++) {
                const segment = document.createElement('div');
                segment.className = `block-segment ${color}`;
                segment.style.width = `${this.blockSize}px`;
                segment.style.height = `${this.blockSize}px`;
                block.appendChild(segment);
            }
            
            block.style.display = 'flex';
            block.draggable = true;
            block.addEventListener('dragstart', this.handleDragStart.bind(this));
            block.addEventListener('dragend', this.handleDragEnd.bind(this));
            
            this.container.appendChild(block);
            this.generatedBlocks.push({
                element: block,
                color: color,
                shape: blockType.shape
            });
        }
    }

    getRandomColor() {
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    }

    getRandomBlockType() {
        return this.blockTypes[Math.floor(Math.random() * this.blockTypes.length)];
    }

    handleDragStart(e) {
        e.target.classList.add('dragging');
        const blockData = {
            color: e.target.dataset.color,
            shape: JSON.parse(e.target.dataset.shape)
        };
        e.dataTransfer.setData('text/plain', JSON.stringify(blockData));
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    removeBlock(block) {
        const index = this.generatedBlocks.findIndex(b => b.element === block);
        if (index !== -1) {
            block.remove();
            this.generatedBlocks.splice(index, 1);
            
            if (this.generatedBlocks.length === 0) {
                this.generateBlocks();
            }
        }
    }

    hasAvailableBlocks() {
        return this.generatedBlocks.length > 0;
    }

    getAvailableColors() {
        return this.generatedBlocks.map(block => block.color);
    }
}

export { BlockGenerator }; 