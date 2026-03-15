'use client'

import { ConfigState } from '@/types/config'
import { ConfigNavigation } from './ConfigNavigation'
import { ConfigContent } from './ConfigContent'
import { useConfigContext } from '@/contexts/ConfigContext'

interface ConfigLayoutProps {
  state: ConfigState
}

export function ConfigLayout({ state }: ConfigLayoutProps) {
  const { setCategory, updateConfig } = useConfigContext()

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex gap-6">
        {/* Left Navigation */}
        <div className="w-60 flex-shrink-0">
          <ConfigNavigation
            currentCategory={state.currentCategory}
            onCategoryChange={setCategory}
            disabled={state.loading}
          />
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          <ConfigContent
            category={state.currentCategory}
            config={state.config}
            onChange={updateConfig}
            errors={state.errors}
            disabled={state.loading || state.saving}
          />
        </div>
      </div>
    </div>
  )
}
