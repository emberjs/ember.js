# Ember.js Releases

## Conceptos

* Ciclo de release de 6 semanas
  * beta semanal
* Canales
  * Release (stable)
  * Beta
  * Canario
* SemVer
  * Parche
  * Menor (punto)
  * Mayor

---

## Notas de Ember sobre Releases punto (No notas de la Release)

1. Cambiar a la rama `beta` y hacer `git pull`
1. Asegurarse de que ningún master commit conceptualmente `[{BUGFIX,DOC} {beta,release}]` sea cherry-picked.
1. `git push origin beta`, y `let ciBranch = kick off a CI build`
1. `PRIOR_VERSION=v2.5.0-beta.1 ./bin/changelog.js | uniq | pbcopy`
1. Abrir `CHANGELOG.md`, pegar los resultados del script anterior, y acomodarlos para lectura humana.
    1. e.g. [BUGFIX beta] -> [BUGFIX], [DEPRECATE beta] -> [DEPRECATE], ...
    1. Revert [BUGFIX ...] -> [BUGFIX] Revert ...
    1. rm [DOC] (usualmente)
    1. rm otras cosas triviales
1. Devolver el CHANGELOG al master
1. `await ciBranch`
    1. si CI funciona, procesar
    1. si CI falla y es un fix que no necesita estar en master (e.g. linting or conflictos con el merge accidentalmente agregados), corregir y reintentar.
    1. en otro caso, iniciar de nuevo
1. Actualizar los archivos de `package.json` y `VERSION` para usar un nuevo número de versión
1. git add/commit -m "Release v2.5.0-beta.2."
1. `git tag v2.5.0-beta.2`
1. `git push origin v2.5.0-beta.2`, y `let ciTag = kick off a CI build` (para producir los assets)
1. `git push origin beta`
1. `git checkout beta`
1. `rm -rf dist && mkdir dist && cp ../components-ember/* dist/`
1. Ir a [https://github.com/emberjs/ember.js/releases](https://github.com/emberjs/ember.js/releases)
1. Clickear en el tag más reciente (2.5.0-beta.2), y dar click en "Edit"
1. Iniciar con `### Changelog` y copiar y pegar el changelog en la caja
1. Hacer el título `Ember 2.5.0-beta.2` y checkear "This is a prerelease" para las betas
1. Actualizar [builds page](https://github.com/ember-learn/builds/tree/master/app/fixtures/ember)
1. Desplegar

---

## Notas de Ember para Release (No Notas de la Release)

Punto de partida: [https://gist.github.com/rwjblue/fb945e55c70d698d4074](https://gist.github.com/rwjblue/fb945e55c70d698d4074)

## LTS Releases

1. En el repositorio bower de Ember, `git co -b lts-2-4` , `git push origin`
1. En `bin/publish_to_s3.js` y `bin/bower_ember_build`, añadir lineas relevantes "lts-2-4" (ver https://github.com/emberjs/ember.js/commit/618de4fa036ab33dc760343decd355ede7b822bb)
1. Seguir los pasos usuales de las releases estables (release el LTS como `2.4.${++latest}`)

## Release Estable

### Revisión de Commits

1. Asegurarse de que todos los commits están etiquetados para la release estén en la release.
1. Revisar los commits a mano desde el último corte de beta.
1. <reminder for rwjblue to fill this in with his git cp script>
1. Puedes encontrarte problemas ya que los commits se encuentran en canario, pero `release` es de una rama de hace 6 semanas
1. @rwjblue: Tengo un script generador de changelog el cual linkea correctamente los commits a los PRs
    1. Busca en todos los commits en la rama beta, encuentra el commit original de donde viene, y encuentra el PR originario
1. Si ocurre que corro de nuevo la herramienta, me dice que ya la he corrido de tal forma que no la corra accidentalmente de nuevo
1. @rwjblue: manualmente escaneo los commits en busca de "bugfix beta" y los cherry-pickeo en la rama beta (la cual se convierte inmediatamente en la rama `release`)
    1. Automating "look for bugfix beta commits since last beta release" seems like an easy win (@tomdale)

### Build Changelog

1. Mandar la rama `beta` para correr el CI 
1. Correr `PRIOR_VERSION=<tag> ./bin/changelog.js | uniq | pbcopy`
1. Limpiar los commits en el CHANGELOG
    1. e.g. [BUGFIX beta] -> [BUGFIX], [DEPRECATE beta] -> [DEPRECATE], ...
    1. Remover los cambios de `[DOC]` (who cares)
    1. Mejorar el formateo (estás en un documento Markdown, así que envuelve el código en ``s.
1. Colapsar todas las secciones "beta" en la release final
    1. E.g., commits de "beta.1", "beta.2", "beta.3" deberían ir bajo "2.4.0" o lo que sea
1. Commit CHANGELOG

### Bump Version

1. Editar `package.json` a la versión correcta (2.4.0)
1. Editar el archivo `VERSION` al valor correcto
    1. Parece fácili automatizar este cambio. Reemplazar la lectura `VERSION` con la lectura `package.json` de tal forma que solo lo tengas que cambiar en un solo sitio
1. Commit las etiquetas `package.json`/`version` 
1. Añadir el commit message: "Release v2.4.0"
1. `git tag v2.4.0`

### Release

1. `git push origin v2.4.0` para enviar SOLO la etiqueta. Esto nos permite correr primero el CI en la etiqueta, el cual hace el despliegue correcto a S3, Bower, etc.
1. DESPUÉS esperar mientras el CI compila hasta finalizar
1. Ir a github y deshabilitar la protección de rama para la rama **release** 
1. Hacer un respaldo de la rama release actual: `git push origin release:release-version`
1. Para hacer esta la rama `release` actual: `git push -f origin beta:release`
    1. Esto promueve a la rama `beta` en tu máquina (la cual tiene todos los commits de la release) a la nueva rama `release` en `origin`
1. Si eres paranóico como rojax, "freeze" esta versión de Ember en amber: `mv ember-beta ember-release-v2.4`
1. Ve a github y habilita la protección de rama para la rama **release** 

### Añadir Release en GitHub

1. Ve a GitHub y añade una nueva release
1. Añadir el título: `Ember 2.4`
1. Copiar y pegar CHANGELOG

```
# generate-api-docs.rb
require 'yaml'

data = YAML.load_file("../components-ember/ember-docs.json")
data["project"]["sha"] = ENV['VERSION']

File.open("data/api.yml", "w") do |f|
  YAML.dump(data, f)
end
```

## En la Beta Release…

1. Cambiate a la rama `master` y haz pull para obtener el `canary` más actual en tu máquina local
1. ¡`nombom` y corre esos tests!
1. Cambia localmente a la `beta`
    1. `git checkout -b beta`
1. Manualmente deshabilita las características
    1. Cambia todo en `packages/@ember/canary-features.ts`'s `DEFAULT_FEATURES` exporta desde `null` a `false` para asegurarse que se ha quitado
    1. Cualquier característica que haya sido GOed cambia a true
1. Correr `ember s -prod`
1. Correr tests en `http://localhost:4200/tests/index.html`
1. Correr tests de production `http://localhost:4200/tests/index.html?dist=prod&prod=true`
1. Ahora debemos ver el commit antes de cambiar a la rama 2.4.0.beta-1. Después encuentra el commit después de eso para iniciar la nueva rama en ese punto.

### Changelog

1. `PRIOR_VERSION=v2.4.0-beta.1^ HEAD=master ./bin/changelog.js | uniq | pbcopy`
1. Limpia el changelog. Asegurate de que el changelog de la release stable ha sido incluido.

#### Tag & Release

1. Actualizar el archivo `package.json` y `VERSION` para usar un nuevo número de versión
1. `git tag v2.5.0-beta.1`
1. `git push origin v2.5.0-beta.1`
1. `git push -f origin beta:beta`
