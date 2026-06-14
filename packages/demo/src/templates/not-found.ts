import { precompileTemplate } from '@ember/template-compilation';

const currentPath = () => window.location.pathname;

export default precompileTemplate(
  `
  {{page-title "Not found"}}
  <div class="flex min-h-full flex-col bg-white pt-16 pb-12">
  <main class="mx-auto flex w-full max-w-7xl flex-grow flex-col justify-center px-6 lg:px-8">
    <div class="flex flex-shrink-0 justify-center">
      <a href="/" class="inline-flex">
        <span class="sr-only">Ember</span>
        <img class="h-12 w-auto" src="/vite.svg" alt="">
      </a>
    </div>
    <div class="py-16">
      <div class="text-center">
        <p class="text-base font-semibold text-indigo-600">404</p>
        <h1 class="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">Page not found.</h1>
        <p class="mt-2 text-base text-gray-500" data-not-found-text>Sorry, we couldn’t find the page {{currentPath}}</p>
        <div class="mt-6">
          <LinkTo @route="main" class="text-base font-medium text-indigo-600 hover:text-indigo-500">
          Go back home
            <span aria-hidden="true"> &rarr;</span>
          </LinkTo>
        </div>
      </div>
    </div>
  </main>
</div>
`,
  { isStrictMode: true, scope: () => ({ currentPath }) }
);
