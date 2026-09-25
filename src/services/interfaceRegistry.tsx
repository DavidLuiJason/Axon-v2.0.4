/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TopBar } from '../components/TopBar';
import { WelcomeState } from '../components/WelcomeState';
import { Composer } from '../components/Composer';
import { ActiveConversation } from '../components/ActiveConversation';
import { NavigationDrawer } from '../components/NavigationDrawer';
import { AxonSourceScreen } from '../components/AxonSourceScreen';
import { SettingsModal } from '../components/SettingsModal';
import { DesignTokensModal } from '../components/DesignTokensModal';
import { ChatMessage, RecentChat } from '../types';

export interface RegisteredInterface {
  id: string;
  name: string;
  description: string;
  category: 'Core' | 'Navigation' | 'System' | 'Source';
  componentFactory: () => React.ReactElement;
  preflightCheck: () => boolean;
}

const REFERENCE_MESSAGES: ChatMessage[] = [
  {
    id: 'user-ref-1',
    role: 'user',
    content:
      'Can you help me build a simple Android app using Kotlin? I want it to have a login screen and a home screen. Keep it beginner-friendly but with clean code.',
    timestamp: 1711200000000,
  },
  {
    id: 'axon-ref-1',
    role: 'assistant',
    content:
      "Absolutely, I can help you build a simple Android app with Kotlin. I'll show you a clean, beginner-friendly structure with a login screen and a home screen. The app will use modern Android practices, and I'll keep the code easy to follow and well-organized.\n\nBefore I provide the full code, let me outline the plan so you know what to expect:\n\n1. Set up a new Android project with Kotlin.\n2. Create a login screen with basic validation.\n3. Build a home screen that appears after login.\n4. Use ViewBinding or Jetpack Compose (depending on your preference).\n5. Keep the code structured, clean, and easy to modify.",
    leadParagraph:
      "Absolutely, I can help you build a simple Android app with Kotlin. I'll show you a clean, beginner-friendly structure with a login screen and a home screen. The app will use modern Android practices, and I'll keep the code easy to follow and well-organized.",
    planIntro: 'Before I provide the full code, let me outline the plan so you know what to expect:',
    planItems: [
      'Set up a new Android project with Kotlin.',
      'Create a login screen with basic validation.',
      'Build a home screen that appears after login.',
      'Use ViewBinding or Jetpack Compose (depending on your preference).',
      'Keep the code structured, clean, and easy to modify.',
    ],
    hasSources: true,
    suggestionPrompt:
      'Would you like me to generate the complete project files, or walk you through each part step by step?',
    timestamp: 1711200005000,
  },
];

const REFERENCE_RECENTS: RecentChat[] = [
  {
    id: 'chat-layout',
    title: 'Describe Axon UI Layout',
    timestamp: 'Just now',
    messages: REFERENCE_MESSAGES,
  },
  {
    id: 'chat-resize',
    title: 'Resize chat input',
    timestamp: '2 hours ago',
    messages: [],
  },
];

/**
 * Real App Interface Registry
 * Contains strictly the real, mountable screens that actually exist in AXON.
 * No imaginary or non-existent screens (e.g. login screens, error popups) are registered.
 */
export const interfaceRegistry: RegisteredInterface[] = [
  {
    id: 'welcome-screen',
    name: 'Home Screen',
    description: 'Main chat welcome state with tree logo mark, greeting, and centered composer.',
    category: 'Core',
    preflightCheck: () => {
      return typeof WelcomeState === 'function' && typeof TopBar === 'function' && typeof Composer === 'function';
    },
    componentFactory: () => (
      <div className="relative w-[390px] h-[844px] bg-[#121315] text-[#ECECEC] font-sans overflow-hidden flex flex-col select-none">
        <TopBar
          onOpenDrawer={() => {}}
          onNewChat={() => {}}
          onResetToWelcome={() => {}}
          hasActiveChat={false}
          onOpenInfo={() => {}}
        />
        <main className="flex-1 w-full overflow-hidden flex flex-col justify-center">
          <WelcomeState userName="Luidel" />
        </main>
        <Composer
          input=""
          setInput={() => {}}
          onSend={() => {}}
          selectedModel="Sonnet 5 Thinking"
          onSelectModel={() => {}}
          isCompactMode={false}
          onToggleCompactMode={() => {}}
          disabled={false}
        />
      </div>
    ),
  },
  {
    id: 'chat-interface',
    name: 'Chat Interface',
    description: 'Active conversation stream with user prompt, assistant response, and suggestions.',
    category: 'Core',
    preflightCheck: () => {
      return typeof ActiveConversation === 'function' && typeof TopBar === 'function' && typeof Composer === 'function';
    },
    componentFactory: () => (
      <div className="relative w-[390px] h-[844px] bg-[#121315] text-[#ECECEC] font-sans overflow-hidden flex flex-col select-none">
        <TopBar
          onOpenDrawer={() => {}}
          onNewChat={() => {}}
          onResetToWelcome={() => {}}
          hasActiveChat={true}
          onOpenInfo={() => {}}
        />
        <main className="flex-1 w-full overflow-hidden flex flex-col justify-between pt-16 pb-36">
          <ActiveConversation
            messages={REFERENCE_MESSAGES}
            onSelectSuggestion={() => {}}
          />
        </main>
        <Composer
          input=""
          setInput={() => {}}
          onSend={() => {}}
          selectedModel="Sonnet 5 Thinking"
          onSelectModel={() => {}}
          isCompactMode={false}
          onToggleCompactMode={() => {}}
          disabled={false}
        />
      </div>
    ),
  },
  {
    id: 'navigation-drawer',
    name: 'Navigation Menu',
    description: 'Side drawer with recent chat history, shortcuts, model selector, and settings.',
    category: 'Navigation',
    preflightCheck: () => {
      return typeof NavigationDrawer === 'function';
    },
    componentFactory: () => (
      <div className="relative w-[390px] h-[844px] bg-[#121315] text-[#ECECEC] font-sans overflow-hidden select-none">
        <NavigationDrawer
          isOpen={true}
          onClose={() => {}}
          recents={REFERENCE_RECENTS}
          activeChatId="chat-layout"
          onSelectRecent={() => {}}
          onNewChat={() => {}}
          onOpenSettings={() => {}}
          onOpenAxonSource={() => {}}
          onOpenInterfaceCapture={() => {}}
          onLogoClick={() => {}}
        />
      </div>
    ),
  },
  {
    id: 'axon-source',
    name: 'Axon Source',
    description: 'Live self-inspection source code viewer and real filesystem inspector.',
    category: 'Source',
    preflightCheck: () => {
      return typeof AxonSourceScreen === 'function';
    },
    componentFactory: () => (
      <div className="relative w-[390px] h-[844px] bg-[#121315] text-[#ECECEC] font-sans overflow-hidden select-none">
        <AxonSourceScreen
          onLogoClick={() => {}}
          recents={REFERENCE_RECENTS}
          userName="Luidel"
          selectedModel="Sonnet 5 Thinking"
          activeChatId="chat-layout"
        />
      </div>
    ),
  },
  {
    id: 'settings-screen',
    name: 'Settings Screen',
    description: 'User profile display name and AI intelligence model preferences.',
    category: 'System',
    preflightCheck: () => {
      return typeof SettingsModal === 'function';
    },
    componentFactory: () => (
      <div className="relative w-[390px] h-[844px] bg-[#121315] text-[#ECECEC] font-sans overflow-hidden flex items-center justify-center p-4 select-none">
        <SettingsModal
          isOpen={true}
          onClose={() => {}}
          userName="Luidel"
          onUpdateUserName={() => {}}
          onLogoClick={() => {}}
        />
      </div>
    ),
  },
  {
    id: 'design-tokens',
    name: 'Design Tokens',
    description: 'Visual system specification tokens, geometry anchors, and typography rules.',
    category: 'System',
    preflightCheck: () => {
      return typeof DesignTokensModal === 'function';
    },
    componentFactory: () => (
      <div className="relative w-[390px] h-[844px] bg-[#121315] text-[#ECECEC] font-sans overflow-hidden flex items-center justify-center p-4 select-none">
        <DesignTokensModal
          isOpen={true}
          onClose={() => {}}
          onSelectView={() => {}}
          onLogoClick={() => {}}
        />
      </div>
    ),
  },
];

export function getRegisteredInterface(id: string): RegisteredInterface | undefined {
  return interfaceRegistry.find((item) => item.id === id);
}
