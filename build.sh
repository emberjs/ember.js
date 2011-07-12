#!/bin/sh

read -r -d '' TMP <<BUILD

# handlebars
packages/handlebars/lib/main.js

# sproutcore-metal
packages/sproutcore-metal/lib/core.js
packages/sproutcore-metal/lib/platform.js
packages/sproutcore-metal/lib/utils.js
packages/sproutcore-metal/lib/accessors.js
packages/sproutcore-metal/lib/properties.js
packages/sproutcore-metal/lib/computed.js
packages/sproutcore-metal/lib/events.js
packages/sproutcore-metal/lib/observer.js
packages/sproutcore-metal/lib/watching.js
packages/sproutcore-metal/lib/array.js
packages/sproutcore-metal/lib/mixin.js
packages/sproutcore-metal/lib/main.js

# sproutcore-runtime
packages/sproutcore-runtime/lib/core.js
packages/sproutcore-runtime/lib/license.js
packages/sproutcore-runtime/lib/system/string.js
packages/sproutcore-runtime/lib/ext/string.js
packages/sproutcore-runtime/lib/ext/function.js
packages/sproutcore-runtime/lib/ext/mixin.js
packages/sproutcore-runtime/lib/ext.js
packages/sproutcore-runtime/lib/mixins/enumerable.js
packages/sproutcore-runtime/lib/mixins/array.js
packages/sproutcore-runtime/lib/mixins/comparable.js
packages/sproutcore-runtime/lib/mixins/copyable.js
packages/sproutcore-runtime/lib/mixins/freezable.js
packages/sproutcore-runtime/lib/mixins/mutable_enumerable.js
packages/sproutcore-runtime/lib/mixins/mutable_array.js
packages/sproutcore-runtime/lib/mixins/observable.js
packages/sproutcore-runtime/lib/mixins.js
packages/sproutcore-runtime/lib/system/string.js
packages/sproutcore-runtime/lib/system/native_array.js
packages/sproutcore-runtime/lib/system/core_object.js
packages/sproutcore-runtime/lib/system/set.js
packages/sproutcore-runtime/lib/system/object.js
packages/sproutcore-runtime/lib/system/namespace.js
packages/sproutcore-runtime/lib/system/application.js
packages/sproutcore-runtime/lib/system/run_loop.js
packages/sproutcore-runtime/lib/system/binding.js
packages/sproutcore-runtime/lib/system/each_proxy.js
packages/sproutcore-runtime/lib/system/array_proxy.js
packages/sproutcore-runtime/lib/system.js
packages/sproutcore-runtime/lib/main.js

# sproutcore-views
packages/sproutcore-views/lib/main.js
packages/sproutcore-views/lib/system/render_buffer.js
packages/sproutcore-views/lib/system/application.js
packages/sproutcore-views/lib/system/event_dispatcher.js
packages/sproutcore-views/lib/system/ext.js
packages/sproutcore-views/lib/system.js
packages/sproutcore-views/lib/views/view.js
packages/sproutcore-views/lib/views/container_view.js
packages/sproutcore-views/lib/views/collection_view.js
packages/sproutcore-views/lib/views.js

# sproutcore-handlebars
packages/sproutcore-handlebars/lib/main.js
packages/sproutcore-handlebars/lib/ext.js
packages/sproutcore-handlebars/lib/views/bindable_span.js
packages/sproutcore-handlebars/lib/views.js
packages/sproutcore-handlebars/lib/helpers/binding.js
packages/sproutcore-handlebars/lib/helpers/collection.js
packages/sproutcore-handlebars/lib/helpers/unbound.js
packages/sproutcore-handlebars/lib/helpers/view.js
packages/sproutcore-handlebars/lib/helpers.js
packages/sproutcore-handlebars/lib/controls/button.js
packages/sproutcore-handlebars/lib/controls/checkbox.js
packages/sproutcore-handlebars/lib/controls/text_field.js
packages/sproutcore-handlebars/lib/controls/text_area.js
packages/sproutcore-handlebars/lib/controls.js
packages/sproutcore-handlebars/lib/handlebars-format.js
packages/sproutcore-handlebars/lib/loader.js

BUILD

rm -f sproutcore2.js
echo "$TMP" | grep "^[A-Za-z0-9_/-]*.js$" | xargs -n 1 -P 1 ./export.sh > sproutcore2.js
