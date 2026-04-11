<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { onNavigate } from '$app/navigation';
	import {
		LayoutDashboard,
		Grid3x3,
		Settings,
		ClipboardList,
		Layers,
		Menu,
		X,
		LogIn,
		LogOut,
		ShieldCheck,
		ShieldAlert,
		Swords,
		Activity,
		Monitor,
		RefreshCw,
		Stethoscope,
		FileCode,
		Plane,
		GitCompare,
		BarChart3
	} from 'lucide-svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { auth, initAuth, login, logout } from '$lib/stores/auth.svelte';
	import { initTheme } from '$lib/stores/theme.svelte';
	import { handleGlobalKeydown, shortcuts } from '$lib/stores/shortcuts.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import TopBar from '$lib/components/ui/TopBar.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import CommandPalette from '$lib/components/ui/CommandPalette.svelte';
	import ShortcutsDialog from '$lib/components/ui/ShortcutsDialog.svelte';
	import '../app.css';

	let { children } = $props();

	// ─── MSAL Popup Redirect Bridge ──────────────────────────────
	// MSAL v5 uses BroadcastChannel to communicate between popup and parent.
	// When Azure AD redirects the popup back with auth params, we call
	// broadcastResponseToMainFrame() to relay the response to the parent window.
	// The popup then closes itself. No full app rendering needed.
	//
	// Detection mirrors MSAL's own parseAuthResponseFromUrl(): check for the
	// "state" parameter in both hash and query string, since Azure AD may
	// return the response in either location depending on response_mode.
	const isPopupRedirect =
		browser &&
		window.opener !== null &&
		(new URLSearchParams(window.location.hash.substring(1)).has('state') ||
			new URLSearchParams(window.location.search).has('state'));

	if (isPopupRedirect) {
		import('@azure/msal-browser/redirect-bridge').then(({ broadcastResponseToMainFrame }) => {
			broadcastResponseToMainFrame()
				.catch((error: unknown) => {
					console.error('MSAL popup bridge failed:', error);
				})
				.finally(() => {
					// Ensure the popup closes even if broadcast failed
					try {
						window.close();
					} catch {
						// window.close() may be blocked by the browser
					}
				});
		});
	}

	let sidebarOpen = $state(false);

	// ─── Navigation Items ──────────────────────────────────────────
	const navSections = [
		{
			label: 'Management',
			items: [
				{ href: '/apps', label: 'Apps', icon: Grid3x3 },
				{ href: '/profiles', label: 'Config Profiles', icon: Settings },
				{ href: '/compliance', label: 'Compliance', icon: ShieldAlert },
				{ href: '/security', label: 'Endpoint Security', icon: Swords },
				{ href: '/updates', label: 'Windows Updates', icon: RefreshCw },
				{ href: '/remediations', label: 'Remediations', icon: Stethoscope },
				{ href: '/scripts', label: 'Platform Scripts', icon: FileCode }
			]
		},
		{
			label: 'Devices',
			items: [
				{ href: '/devices', label: 'Device Inventory', icon: Monitor },
				{ href: '/autopilot', label: 'Autopilot', icon: Plane }
			]
		},
		{
			label: 'Tools',
			items: [
				{ href: '/compare', label: 'Policy Compare', icon: GitCompare },
				{ href: '/reports', label: 'Reports', icon: BarChart3 },
				{ href: '/status', label: 'Deploy Status', icon: Activity },
				{ href: '/audit', label: 'Audit Log', icon: ClipboardList }
			]
		},
		{
			label: 'Settings',
			items: [{ href: '/settings', label: 'Permissions', icon: ShieldCheck }]
		}
	];

	const dashboardItem = { href: '/', label: 'Dashboard', icon: LayoutDashboard };
	const bulkAssignItem = { href: '/assign', label: 'Bulk Assign', icon: Layers, highlight: true };

	// Mobile bottom nav items
	const mobileNavItems = [
		{ href: '/', label: 'Home', icon: LayoutDashboard },
		{ href: '/apps', label: 'Apps', icon: Grid3x3 },
		{ href: '/devices', label: 'Devices', icon: Monitor },
		{ href: '/profiles', label: 'Profiles', icon: Settings },
		{ href: '/assign', label: 'Assign', icon: Layers }
	];

	function isActive(href: string): boolean {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}

	// Initialize auth and theme on client-side hydration.
	// Skip in popup redirects — the parent window reads the popup URL directly.
	$effect(() => {
		if (browser && !isPopupRedirect) {
			initAuth();
			initTheme();
		}
	});

	// Close sidebar on route change (mobile)
	$effect(() => {
		const _pathname = page.url.pathname;
		void _pathname;
		sidebarOpen = false;
	});

	// ─── View Transitions ─────────────────────────────────────────
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if isPopupRedirect}
	<!-- MSAL popup: broadcastResponseToMainFrame() relays the auth response
	     to the parent window via BroadcastChannel, then this popup closes. -->
{:else}
	<div class="bg-canvas min-h-screen">
		<!-- Mobile top bar -->
		<div class="bg-sidebar fixed top-0 right-0 left-0 z-40 flex h-14 items-center px-4 md:hidden">
			<button
				onclick={() => (sidebarOpen = !sidebarOpen)}
				class="text-white/80 hover:text-white"
				aria-label="Toggle menu"
			>
				{#if sidebarOpen}
					<X size={24} />
				{:else}
					<Menu size={24} />
				{/if}
			</button>
			<span class="ml-3 text-sm font-semibold text-white">Intune Assignments</span>
		</div>

		<!-- Mobile backdrop -->
		{#if sidebarOpen}
			<button
				class="fixed inset-0 z-40 bg-black/50 md:hidden"
				onclick={() => (sidebarOpen = false)}
				aria-label="Close menu"
				tabindex="-1"
			></button>
		{/if}

		<!-- Sidebar -->
		<aside
			class="bg-sidebar fixed top-0 left-0 z-50 flex h-full w-60 flex-col transition-transform duration-200 ease-out md:translate-x-0 {sidebarOpen
				? 'max-md:translate-x-0'
				: 'max-md:-translate-x-full'}"
		>
			<!-- Logo area with subtle gradient -->
			<div
				class="flex h-14 items-center gap-2 px-5"
				style="background: linear-gradient(135deg, oklch(0.22 0.03 260) 0%, transparent 100%);"
			>
				<div class="bg-accent flex h-8 w-8 items-center justify-center rounded-lg">
					<Layers size={18} class="text-white" />
				</div>
				<span class="text-sm font-semibold text-white">Intune Assignments</span>
			</div>

			<!-- Dashboard link -->
			<nav class="mt-3 px-3">
				<a
					href={dashboardItem.href}
					class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors {isActive(
						dashboardItem.href
					)
						? 'bg-sidebar-active text-white'
						: 'hover:bg-sidebar-hover text-white/70 hover:text-white'}"
				>
					<LayoutDashboard size={18} />
					{dashboardItem.label}
				</a>
			</nav>

			<!-- Grouped navigation -->
			<nav class="mt-2 flex flex-1 flex-col gap-4 px-3">
				{#each navSections as section (section.label)}
					<div>
						<p class="mb-1 px-3 text-[10px] font-semibold tracking-wider text-white/40 uppercase">
							{section.label}
						</p>
						<div class="space-y-0.5">
							{#each section.items as item (item.href)}
								{@const Icon = item.icon}
								<a
									href={item.href}
									class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors {isActive(
										item.href
									)
										? 'bg-sidebar-active text-white'
										: 'hover:bg-sidebar-hover text-white/70 hover:text-white'}"
								>
									<Icon size={18} />
									{item.label}
								</a>
							{/each}
						</div>
					</div>
				{/each}

				<!-- Bulk Assign CTA -->
				<div class="border-sidebar-border border-t pt-3">
					<a
						href={bulkAssignItem.href}
						class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors {isActive(
							bulkAssignItem.href
						)
							? 'bg-sidebar-active text-white'
							: 'border-accent/30 text-accent-light hover:bg-sidebar-hover border hover:text-white'}"
					>
						<Layers size={18} />
						{bulkAssignItem.label}
					</a>
				</div>
			</nav>

			<!-- Auth area -->
			<div class="border-sidebar-border border-t p-4">
				{#if auth.isAuthenticated && auth.account}
					<div class="mb-3 flex items-center gap-3 px-1">
						<Avatar name={auth.account.name ?? 'User'} size="sm" />
						<div class="min-w-0">
							<p class="truncate text-sm font-medium text-white">
								{auth.account.name ?? 'User'}
							</p>
							<p class="truncate text-xs text-white/40">
								{auth.account.username}
							</p>
						</div>
					</div>
					<button
						onclick={() => logout()}
						class="hover:bg-sidebar-hover flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white"
					>
						<LogOut size={16} />
						<span>Sign out</span>
					</button>
				{:else if !auth.isInitializing}
					<button
						onclick={() => login()}
						class="hover:bg-sidebar-hover flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:text-white"
					>
						<LogIn size={18} />
						<span>Sign in with Microsoft</span>
					</button>
				{/if}
			</div>
		</aside>

		<!-- Main content -->
		<main class="min-h-screen pt-14 pb-20 md:ml-60 md:pt-0 md:pb-0">
			<TopBar />
			<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
				{@render children()}
			</div>
		</main>

		<!-- Mobile bottom tab bar -->
		<nav
			class="border-border bg-surface/95 fixed right-0 bottom-0 left-0 z-40 flex h-16 items-center justify-around border-t backdrop-blur-sm md:hidden"
			aria-label="Mobile navigation"
		>
			{#each mobileNavItems as item (item.href)}
				{@const Icon = item.icon}
				<a
					href={item.href}
					class="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors {isActive(
						item.href
					)
						? 'text-accent'
						: 'text-muted'}"
				>
					<Icon size={20} />
					{item.label}
				</a>
			{/each}
		</nav>

		<ToastContainer />
		<CommandPalette />
		<ShortcutsDialog open={shortcuts.dialogOpen} onclose={() => (shortcuts.dialogOpen = false)} />
	</div>
{/if}
