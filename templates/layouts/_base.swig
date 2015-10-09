<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{title}}</title>
        <link href="//maxcdn.bootstrapcdn.com/bootstrap/3.2.0/css/bootstrap.min.css" rel="stylesheet">
        {% if environment == "development" %}
            <link rel="stylesheet" href="/css/screen.css">
            <link rel="shortcut icon" href="/img/favicon-dev.png">
        {% else %}
            <link rel="stylesheet" href="{{ rev('css/screen.css') }}">
            <link rel="shortcut icon" href="/img/favicon.png">
        {% endif %}
    </head>
    <body{% if body_id %} id="{{ body_id }}"{% endif %}{% if body_classes %} class="{{ body_classes }}"{% endif %}>
        {# uncomment to debug #}
        {#
        <pre>
            {{_ctx|json(4)}}
        </pre>
        #}

        <div id="page-wrap">
            <div class="container">
                {% block content %}{% endblock %}
            </div>
        </div>

        <footer>
            <p>&copy; {{ now()|date('Y') }}</p>
        </footer>
        
        <script src="//ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js"></script>
        <script src="//maxcdn.bootstrapcdn.com/bootstrap/3.2.0/js/bootstrap.min.js"></script>
        {% if environment == "development" %}
            <!-- build:js js/all.js -->
            <script src="/js/lib/some-lib.js"></script>
            <script src="/js/source/index.js"></script>
            <!-- endbuild -->
        {% else %}
            <script src="{{ rev('js/all.js') }}"></script>
        {% endif %}
    </body>
</html>
