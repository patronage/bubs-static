<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{title}}</title>
        <link rel="stylesheet" href="/css/screen.css">
    </head>
    <body{% if body_id %} id="{{ body_id }}"{% endif %}>
        <div id="page-wrap">
            <div class="container">
                {% block content %}{% endblock %}
            </div>
        </div>
        <script src="//ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js"></script>
    </body>
</html>
