# @glimmer/interfaces

The `interfaces` package contains TypeScript interfaces for objects that are
shared between the compiler and the runtime. This separation allows data
structures used in both environments to be typechecked while keeping a clean
separation of implementations. This division allows us to make sure that, for
example, compiler code is not inadvertently relied on in the runtime.

# ComponentMetadata
# ComponentDefinitionMetadata

# InstanceState
# StaticState

specifier

ComponentDefinition = Component Manager + StaticState