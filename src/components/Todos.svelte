<script>
    import {onMount} from 'svelte';
    import {supabase, getCurrentUser} from '../lib/supabase';
    import {showError, showNotification} from '../lib/stores';

    let todos = [];
    let newTodo = '';
    let isLoading = false;
    let isAddingTodo = false;

    async function fetchTodos() {
        try {
            isLoading = true;
            const user = await getCurrentUser();
            if (!user) return;

            const {data, error} = await supabase
                .from('todos')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', {ascending: false});

            if (error) throw error;
            todos = data || [];
        } catch (err) {
            console.error('Error fetching todos:', err);
            showError('Failed to load todos');
        } finally {
            isLoading = false;
        }
    }

    async function addTodo() {
        const todoText = newTodo.trim();
        if (!todoText) {
            showError('Please enter a task');
            return;
        }

        if (todoText.length > 500) {
            showError('Task is too long (max 500 characters)');
            return;
        }

        try {
            isAddingTodo = true;
            const user = await getCurrentUser();
            if (!user) return;

            const {data, error} = await supabase.from('todos').insert({
                user_id: user.id,
                text: todoText
            }).select();

            if (error) throw error;

            if (data && data[0]) {
                todos = [data[0], ...todos];
            }

            newTodo = '';
            showNotification('✅ Task added successfully!');
        } catch (err) {
            console.error('Error adding todo:', err);
            showError('Failed to add task');
        } finally {
            isAddingTodo = false;
        }
    }

    async function toggleTodo(todo) {
        try {
            const {error} = await supabase
                .from('todos')
                .update({completed: !todo.completed})
                .eq('id', todo.id);

            if (error) throw error;

            // Update local state
            todos = todos.map(t =>
                t.id === todo.id ? {...t, completed: !t.completed} : t
            );

            showNotification(todo.completed ? '↩️ Task reopened' : '✅ Task completed!');
        } catch (err) {
            console.error('Error toggling todo:', err);
            showError('Failed to update task');
        }
    }

    async function deleteTodo(id) {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }

        try {
            const {error} = await supabase
                .from('todos')
                .delete()
                .eq('id', id);

            if (error) throw error;

            todos = todos.filter(t => t.id !== id);
            showNotification('🗑️ Task deleted');
        } catch (err) {
            console.error('Error deleting todo:', err);
            showError('Failed to delete task');
        }
    }

    async function incrementPomodoro(todo) {
        try {
            const {error} = await supabase
                .from('todos')
                .update({pomodoro_count: todo.pomodoro_count + 1})
                .eq('id', todo.id);

            if (error) throw error;

            // Update local state
            todos = todos.map(t =>
                t.id === todo.id ? {...t, pomodoro_count: t.pomodoro_count + 1} : t
            );

            showNotification('🍅 Pomodoro added!');
        } catch (err) {
            console.error('Error incrementing pomodoro:', err);
            showError('Failed to add pomodoro');
        }
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            addTodo();
        }
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    onMount(() => {
        fetchTodos();
    });

    let filter = 'all';

    $: filteredTodos = todos.filter(todo => {
        if (filter === 'active') return !todo.completed;
        if (filter === 'completed') return todo.completed;
        return true; // 'all' filter
    });
</script>

<div class="todos-container">
    <div class="todos-header">
        <h2>📝 Coffee Tasks</h2>
        <div class="tabs">
            <button class:active={filter === 'all'} on:click={() => filter = 'all'}>
                All Beans ({todos.length})
            </button>
            <button class:active={filter === 'active'} on:click={() => filter = 'active'}>
                Brewing ({todos.filter(t => !t.completed).length})
            </button>
            <button class:active={filter === 'completed'} on:click={() => filter = 'completed'}>
                Enjoyed ({todos.filter(t => t.completed).length})
            </button>
        </div>
    </div>

    <div class="add-todo">
        <div class="input-container">
            <span class="icon">➕</span>
            <input
                    bind:value={newTodo}
                    placeholder="Add a new task..."
                    class="todo-input"
                    on:keypress={handleKeyPress}
                    disabled={isAddingTodo}
                    maxlength="500"
            >
            <button
                    on:click={addTodo}
                    class="add-btn"
                    disabled={isAddingTodo || !newTodo.trim()}
            >
                {isAddingTodo ? 'Brewing...' : 'Add'}
            </button>
        </div>
        <div class="char-counter">{newTodo.length}/500</div>
    </div>

    {#if isLoading}
        <div class="loading-state">
            <div class="coffee-cup">☕</div>
            <p>Brewing your tasks...</p>
        </div>
    {:else if filteredTodos.length === 0}
        <div class="empty-state">
            <div class="coffee-icon">🍃</div>
            <h3>{filter === 'completed' ? 'No completed tasks yet' : 'Your task list is empty'}</h3>
            <p>{filter === 'completed' ? 'Complete some tasks to see them here!' : 'Add your first task above ☕'}</p>
        </div>
    {:else}
        <div class="todos-list">
            {#each filteredTodos as todo (todo.id)}
                <div class:completed={todo.completed} class="todo-item">
                    <label class="todo-checkbox">
                        <input
                                type="checkbox"
                                checked={todo.completed}
                                on:change={() => toggleTodo(todo)}
                                class="checkbox"
                        >
                        <span class="checkmark"></span>
                        <span class="todo-text">{todo.text}</span>
                    </label>

                    <div class="todo-meta">
                        <span class="todo-date">📅 {formatDate(todo.created_at)}</span>
                        {#if todo.pomodoro_count > 0}
                            <button on:click={() => incrementPomodoro(todo)} class="pomodoro-btn">
                                🍅 ×{todo.pomodoro_count}
                            </button>
                        {/if}
                    </div>

                    <button on:click={() => deleteTodo(todo.id)} class="delete-btn">
                        🗑️
                    </button>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .todos-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
    }

    .todos-header {
        margin-bottom: 30px;
    }

    h2 {
        color: var(--coffee-cream);
        margin: 0 0 15px 0;
        font-size: 1.8rem;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .tabs {
        display: flex;
        gap: 10px;
        margin-top: 20px;
        flex-wrap: wrap;
    }

    .tabs button {
        padding: 8px 16px;
        background: rgba(44, 24, 16, 0.5);
        border: 1px solid var(--coffee-light);
        color: var(--coffee-cream);
        border-radius: 20px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .tabs button:hover {
        background: rgba(160, 82, 45, 0.3);
    }

    .tabs button.active {
        background: var(--coffee-light);
        color: var(--coffee-dark);
        font-weight: 600;
    }

    .add-todo {
        margin-bottom: 30px;
    }

    .input-container {
        display: flex;
        align-items: center;
        background: rgba(44, 24, 16, 0.5);
        border-radius: 12px;
        padding: 5px 15px;
        border: 1px solid rgba(139, 69, 19, 0.3);
    }

    .icon {
        margin-right: 10px;
        color: var(--coffee-cream);
    }

    .todo-input {
        flex: 1;
        padding: 12px 0;
        background: transparent;
        border: none;
        color: var(--coffee-foam);
        font-size: 1rem;
    }

    .todo-input::placeholder {
        color: var(--coffee-light);
        opacity: 0.7;
    }

    .todo-input:focus {
        outline: none;
    }

    .add-btn {
        padding: 8px 16px;
        background: var(--coffee-light);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .add-btn:hover:not(:disabled) {
        background: var(--coffee-brown);
        transform: translateY(-2px);
    }

    .add-btn:disabled {
        background: var(--coffee-darker);
        color: var(--coffee-light);
        cursor: not-allowed;
    }

    .char-counter {
        text-align: right;
        font-size: 0.8rem;
        color: var(--coffee-light);
        margin-top: 5px;
    }

    .loading-state {
        text-align: center;
        padding: 40px;
        color: var(--coffee-cream);
    }

    .coffee-cup {
        font-size: 3rem;
        margin-bottom: 15px;
        animation: bounce 2s infinite;
    }

    .empty-state {
        text-align: center;
        padding: 40px;
        color: var(--coffee-light);
    }

    .coffee-icon {
        font-size: 3rem;
        margin-bottom: 15px;
        opacity: 0.7;
    }

    .empty-state h3 {
        color: var(--coffee-cream);
        margin: 0 0 10px 0;
    }

    .empty-state p {
        margin: 0;
    }

    .todos-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .todo-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 15px;
        background: rgba(44, 24, 16, 0.5);
        border-radius: 12px;
        border: 1px solid rgba(139, 69, 19, 0.3);
        transition: all 0.3s ease;
    }

    .todo-item:hover {
        background: rgba(44, 24, 16, 0.7);
        transform: translateY(-2px);
    }

    .todo-item.completed {
        opacity: 0.6;
    }

    .todo-checkbox {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        cursor: pointer;
        position: relative;
    }

    .checkbox {
        position: absolute;
        opacity: 0;
        cursor: pointer;
        height: 0;
        width: 0;
    }

    .checkmark {
        position: relative;
        height: 20px;
        width: 20px;
        background: rgba(26, 15, 10, 0.8);
        border: 1px solid var(--coffee-light);
        border-radius: 4px;
        transition: all 0.3s ease;
    }

    .checkbox:checked ~ .checkmark {
        background: var(--coffee-light);
    }

    .checkmark:after {
        content: "";
        position: absolute;
        display: none;
        left: 6px;
        top: 2px;
        width: 5px;
        height: 10px;
        border: solid var(--coffee-dark);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
    }

    .checkbox:checked ~ .checkmark:after {
        display: block;
    }

    .todo-text {
        flex: 1;
        color: var(--coffee-foam);
    }

    .todo-item.completed .todo-text {
        text-decoration: line-through;
        color: var(--coffee-light);
    }

    .todo-meta {
        display: flex;
        gap: 15px;
        align-items: center;
        font-size: 0.9rem;
    }

    .todo-date {
        color: var(--coffee-light);
    }

    .pomodoro-btn {
        background: rgba(210, 180, 140, 0.2);
        border: 1px solid var(--coffee-cream);
        color: var(--coffee-cream);
        border-radius: 12px;
        padding: 4px 8px;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .pomodoro-btn:hover {
        background: rgba(210, 180, 140, 0.3);
    }

    .delete-btn {
        background: none;
        border: none;
        color: #FF6B6B;
        cursor: pointer;
        font-size: 1.2rem;
        opacity: 0.7;
        transition: all 0.3s ease;
    }

    .delete-btn:hover {
        opacity: 1;
        transform: scale(1.1);
    }

    @media (max-width: 768px) {
        .todo-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
        }

        .todo-meta {
            width: 100%;
            justify-content: space-between;
        }

        .delete-btn {
            align-self: flex-end;
        }
    }
</style>