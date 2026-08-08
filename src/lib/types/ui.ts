// SPDX-License-Identifier: AGPL-3.0-only

import type { ComponentType, SvelteComponent } from 'svelte';
import type { IconProps } from 'lucide-svelte';

/**
 * A lucide-svelte icon passed as a component constructor, e.g. `icon={RefreshCw}`.
 * Rendered by the receiver as `<Icon size={...} />`, so it is the component itself
 * rather than a rendered element.
 *
 * Deliberately the LEGACY class-component type, not Svelte 5's `Component<...>`:
 * lucide-svelte 1.0.1 still declares `svelte ^4.2.19` as its peer and ships
 * `SvelteComponentTyped` subclasses. Typing this as `Component<IconProps>`
 * type-checks at the definition but fails at every call site.
 */
export type IconComponent = ComponentType<SvelteComponent<IconProps>>;
