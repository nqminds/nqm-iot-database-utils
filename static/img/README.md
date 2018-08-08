# Images for JSDocs

![interlinq-logo-darker.png](./interlinq-logo-darker.png)

```
wget http://new.nqminds.com/wp-content/uploads/sites/3/2015/02/interlinq-tall-w.png -O interlinq-tall-w.png
convert -trim -brightness-contrast -50x10 -geometry x80 interlinq-tall-w.png interlinq-logo-darker.png
```

![nqminds-blue-logo.png](./nqminds-blue-logo.png)

```
wget http://new.nqminds.com/wp-content/uploads/sites/3/2016/07/nqminds-blue-logo1-300x57.png -O nqminds-blue-logo-orig.png
# add white-space to match height of Interlinq logo
convert -gravity center -extent x80 nqminds-blue-logo-orig.png nqminds-blue-logo.png
```

