const cacheWorker = new Worker('./cacheWorker.js');

const ImageCache = {
    getImage(url) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("imageCache", 5);
            request.onerror = reject;
            request.onupgradeneeded = event => {
                const db = event.target.result;
                db.createObjectStore('images', {keyPath: 'url'});
            };
            request.onsuccess = event => {
                const db = event.target.result;
                const tx = db.transaction(['images']);
                tx.objectStore('images').get(url).onsuccess = event => {
                    if (event.target.result) {
                        resolve(event.target.result.data);
                        return;
                    }

                    resolve(url);
                    cacheWorker.postMessage({url});
                };
            };
        });
    }
}

const DynamicImage = React.createClass({
    componentDidMount() {
        if (!this.props.shouldCache) {
            return;
        }
        ImageCache.getImage(this.props.src).then(cachedSrc => {
            const s = {cachedSrc};
            if (this.isMounted())
                this.setState(s);
            else
                this.state = s;
        });
    },

    render() {
        if (!this.props.src) {
            return <div style={{
                transform: `translateY(${this.props.index * 100}%)`,
                backgroundColor: this.props.prominentColor}} className="bg item" />;
        }

        return <img src={_.get(this.state, 'cachedSrc', this.props.src)}
            key={this.props.index}
            style={{
                transform: `translateY(${this.props.index * 100}%)`,
                backgroundColor: this.props.src ? 'none' : this.props.prominentColor}}
            onLoad={() => this.setState({loaded: true})}
            className={'item ' + (_.get(this.state, 'loaded') ? 'loaded' : '')} />;
    }
});

const GalleryLayer = React.createClass({
    render() {
        return <div className={`${this.props.className || ''} galleryLayer`}>
            {_(this.props.images)
                .map((image, index) => <DynamicImage image={image} prominentColor={image.prominentColor} src={this.props.srcGetter(image)} index={index} key={index} shouldCache={this.props.shouldCache} />)
                .slice(Math.max(0, Math.floor(this.props.midIndex - this.props.visibleItems / 2)), Math.floor(this.props.midIndex + this.props.visibleItems / 2))
                .value()
            }
            </div>;
    }
});

const GalleryImpl = React.createClass({
    render() {
        return <div className="fastGallery">
            <GalleryLayer images={this.props.images} srcGetter={() => null} visibleItems={1} midIndex={this.props.images.length} key="heighter" className="invisible" />
            <GalleryLayer images={this.props.images} srcGetter={() => null} visibleItems={500} midIndex={this.props.midIndex} key="colors"/>
            <GalleryLayer images={this.props.images} srcGetter={image => image.thumbnail.url} visibleItems={50} midIndex={this.props.midIndex} shouldCache={true} key="thumbnails" />
            <GalleryLayer images={this.props.images} srcGetter={image => image.standard_resolution.url} visibleItems={5} midIndex={this.props.midIndex} key="full" />
        </div>;
    }
});

const galleryComp = React.createClass({
    componentDidMount() {
        window.addEventListener('scroll', () => this.setState({bodyHeight: document.body.scrollHeight}));
    },

    render() {
        const bodyHeight = _.get(this.state, 'bodyHeight', 0);
        const itemHeight = bodyHeight / this.props.images.length;
        const screenMiddle = document.body.scrollTop + screen.availHeight / 2;
        const midIndex = itemHeight ? screenMiddle / itemHeight : 0;

        return <GalleryImpl images={this.props.images} midIndex={midIndex} />
    }
});
